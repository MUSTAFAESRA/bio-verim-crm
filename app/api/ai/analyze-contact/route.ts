import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export interface ContactAnalysis {
  sentiment: "positive" | "neutral" | "negative";
  sentimentLabel: "Olumlu" | "Nötr" | "Olumsuz";
  interestScore: number; // 1-10
  insight: string; // 1-2 cümle
  tags: string[]; // ["fiyat sordu", "bilgi istedi", "itiraz etti", vb.]
  nextSuggestion: string; // Sonraki adım önerisi
  source: "gemini" | "mock";
  analyzedAt: string;
}

export async function POST(req: NextRequest) {
  const { contactLogId, customerId } = await req.json();
  if (!contactLogId || !customerId) {
    return NextResponse.json({ error: "contactLogId ve customerId gerekli" }, { status: 400 });
  }

  const supabase = await createClient();

  // Temas kaydını çek
  const { data: logData } = await supabase
    .from("contact_logs")
    .select("*")
    .eq("id", contactLogId)
    .single();

  if (!logData) {
    return NextResponse.json({ error: "Temas kaydı bulunamadı" }, { status: 404 });
  }

  const log = logData as {
    id: string;
    contact_type: string;
    notes: string | null;
    outcome: string | null;
    direction: string | null;
    subject: string | null;
    contacted_at: string;
  };

  // Müşteri adını çek
  const { data: customerData } = await supabase
    .from("customers")
    .select("company_name, segment")
    .eq("id", customerId)
    .single();

  const customerName = (customerData as { company_name: string; segment: string } | null)?.company_name ?? "Bilinmiyor";
  const segment = (customerData as { company_name: string; segment: string } | null)?.segment ?? "lead";

  const geminiKey = process.env.GEMINI_API_KEY;

  let result: ContactAnalysis;

  if (!geminiKey || geminiKey.startsWith("your_") || (!log.notes && !log.subject)) {
    result = getMockAnalysis(log.outcome, log.contact_type, segment);
  } else {
    const contactTypeLabels: Record<string, string> = {
      call: "Telefon araması",
      visit: "Yüz yüze ziyaret",
      email: "Email",
      whatsapp: "WhatsApp",
      facebook_dm: "Facebook Messenger",
      instagram_dm: "Instagram DM",
      linkedin_dm: "LinkedIn DM",
      other: "Diğer",
    };

    const outcomeLabels: Record<string, string> = {
      interested: "İlgilendi",
      not_interested: "İlgilenmedi",
      callback: "Sonra aranacak",
      meeting_scheduled: "Toplantı planlandı",
      sale_made: "Satış yapıldı",
      no_answer: "Cevap vermedi",
      left_message: "Mesaj bırakıldı",
    };

    const prompt = `Sen bir satış analisti olarak Bioverim Gübre satış temsilcisinin yaptığı müşteri temasını analiz ediyorsun.

MÜŞTERİ: ${customerName} (Segment: ${segment === "active" ? "Aktif" : segment === "lead" ? "Aday" : "Pasif"})
TEMAS TİPİ: ${contactTypeLabels[log.contact_type] ?? log.contact_type}
YÖN: ${log.direction === "inbound" ? "Müşteri bizi aradı/yazdı" : "Biz müşteriyi aradık/yazdık"}
SONUÇ: ${outcomeLabels[log.outcome ?? ""] ?? log.outcome ?? "Belirtilmemiş"}
KONU: ${log.subject ?? "—"}
NOTLAR: ${log.notes?.slice(0, 300) ?? "—"}
TEMAS TARİHİ: ${new Date(log.contacted_at).toLocaleDateString("tr-TR")}

Bu temasa dayanarak şu analizi yap:
{
  "sentiment": "positive" veya "neutral" veya "negative",
  "sentimentLabel": "Olumlu" veya "Nötr" veya "Olumsuz",
  "interestScore": 1-10 arası tam sayı (müşterinin satın alma ilgisi),
  "insight": "1-2 cümle: Bu temasta ne öğrendik, müşteri neyi istedi/düşündü?",
  "tags": ["en fazla 3 kısa etiket", "fiyat sordu", "bilgi istedi", "itiraz etti", "acil ihtiyaç", "tekrar aranacak" gibi],
  "nextSuggestion": "Bu temasa göre sonraki adım ne olmalı? 1 cümle."
}

KURALLAR:
- sentiment: Müşterinin tutumu — notlar olumluysa/ilgi varsa "positive", nötrse "neutral", olumsuzsa/ret varsa "negative"
- interestScore: 8-10=Yüksek ilgi/satın alacak, 5-7=Orta ilgi/takip lazım, 1-4=Düşük ilgi/red
- Sadece JSON döndür.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 350,
              temperature: 0.2,
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );

      if (!res.ok) throw new Error("Gemini: " + res.status);
      const data = await res.json();
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON parse failed");

      const parsed = JSON.parse(match[0]);
      result = {
        sentiment: parsed.sentiment ?? "neutral",
        sentimentLabel: parsed.sentimentLabel ?? "Nötr",
        interestScore: parsed.interestScore ?? 5,
        insight: parsed.insight ?? "",
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 3) : [],
        nextSuggestion: parsed.nextSuggestion ?? "",
        source: "gemini",
        analyzedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.error("Contact analysis hatası:", e);
      result = getMockAnalysis(log.outcome, log.contact_type, segment);
    }
  }

  return NextResponse.json(result);
}

function getMockAnalysis(
  outcome: string | null,
  contactType: string,
  segment: string
): ContactAnalysis {
  const isPositive = outcome === "interested" || outcome === "meeting_scheduled" || outcome === "sale_made";
  const isNegative = outcome === "not_interested";

  const sentiment: ContactAnalysis["sentiment"] = isPositive ? "positive" : isNegative ? "negative" : "neutral";
  const sentimentLabel: ContactAnalysis["sentimentLabel"] = isPositive ? "Olumlu" : isNegative ? "Olumsuz" : "Nötr";

  const interestScore = isPositive ? 7 : isNegative ? 2 : segment === "active" ? 6 : 4;

  const insightMap: Record<string, string> = {
    interested: "Müşteri ilgi gösterdi. Detaylı bilgi verilmeli.",
    not_interested: "Müşteri şu an ilgilenmiyor. Belirli bir süre sonra tekrar denenebilir.",
    callback: "Müşteri uygun zamanda geri aranmak istedi.",
    meeting_scheduled: "Toplantı planlandı. Hazırlık yapılmalı.",
    sale_made: "Satış tamamlandı. Teslimat ve takip sürecine geçilmeli.",
    no_answer: "Müşteriye ulaşılamadı. Farklı saat/kanal denenmeli.",
    left_message: "Mesaj bırakıldı. Müşterinin geri dönüşü bekleniyor.",
  };

  return {
    sentiment,
    sentimentLabel,
    interestScore,
    insight: insightMap[outcome ?? ""] ?? "Temas tamamlandı. Detaylı not girilmesi önerilir.",
    tags: outcome === "interested" ? ["ilgi gösterdi"] : outcome === "sale_made" ? ["satış yapıldı"] : ["takip gerekli"],
    nextSuggestion: isPositive
      ? "3-5 gün içinde tekrar ulaşın ve teklif sunun."
      : isNegative
      ? "3-4 hafta sonra tekrar deneyin, yeni ürün/kampanya varsa bildirin."
      : "1-2 hafta içinde WhatsApp veya telefon ile takip edin.",
    source: "mock",
    analyzedAt: new Date().toISOString(),
  };
}
