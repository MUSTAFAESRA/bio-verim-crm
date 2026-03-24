import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(_req: NextRequest) {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.startsWith("your_")) {
    return NextResponse.json(getMockBriefing());
  }

  const supabase = await createClient();
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [
      { data: dueSequences },
      { data: recentLogs },
      { count: activeCount },
      { count: leadCount },
      { count: passiveCount },
    ] = await Promise.all([
      supabase
        .from("customer_sequences")
        .select("id, current_step, next_contact_at, contact_sequences(name, steps), customers(id, company_name, segment)")
        .eq("status", "active")
        .lte("next_contact_at", in48h.toISOString())
        .order("next_contact_at", { ascending: true })
        .limit(20),
      supabase
        .from("contact_logs")
        .select("customer_id, contact_type, outcome, contacted_at, customers(company_name)")
        .gte("contacted_at", ago30d.toISOString())
        .order("contacted_at", { ascending: false })
        .limit(30),
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("segment", "active"),
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("segment", "lead"),
      supabase.from("customers").select("*", { count: "exact", head: true }).eq("segment", "passive"),
    ]);

    // Sekans özetini hazırla
    const dueText = (dueSequences ?? []).map((cs: Record<string, unknown>) => {
      const seq = cs.contact_sequences as { name: string; steps: Array<{ step_no: number; channel: string }> } | null;
      const customer = cs.customers as { id: string; company_name: string; segment: string } | null;
      const step = seq?.steps?.find((s) => s.step_no === (cs.current_step as number));
      const dueAt = new Date(cs.next_contact_at as string);
      const hoursLeft = Math.round((dueAt.getTime() - now.getTime()) / 3600000);
      return `- ${customer?.company_name ?? "?"} | Sekans: ${seq?.name ?? "?"} | Kanal: ${step?.channel ?? "?"} | ${hoursLeft <= 0 ? "GECİKMİŞ" : `${hoursLeft}s içinde`}`;
    }).join("\n") || "Yok";

    // Son temasları özetle
    const logsText = (recentLogs ?? []).slice(0, 15).map((l: Record<string, unknown>) => {
      const cust = l.customers as { company_name: string } | null;
      return `- ${cust?.company_name ?? "?"} | ${l.contact_type} | ${l.outcome ?? "—"} | ${new Date(l.contacted_at as string).toLocaleDateString("tr-TR")}`;
    }).join("\n") || "Yok";

    const prompt = `Sen Bioverim Gübre ve Tarım Ürünleri A.Ş.'nin akıllı satış asistanısın.
Bugün: ${now.toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

AKTİF SEKVANS ADAYLARI (48 saat içinde zamanı gelecek veya gecikmişler):
${dueText}

SON 30 GÜN TEMAS GEÇMİŞİ:
${logsText}

MÜŞTERİ DAĞILIMI:
- Aktif: ${activeCount ?? 0} müşteri
- Aday: ${leadCount ?? 0} müşteri
- Pasif: ${passiveCount ?? 0} müşteri

Bugün satış ekibinin öncelik vermesi gereken müşterileri analiz et.
Şu JSON formatını döndür (başka hiçbir şey yazma):
{
  "urgentContacts": [
    {
      "customerId": "müşteri id (bilinmiyorsa boş bırak)",
      "name": "firma adı",
      "reason": "Neden öncelikli? (kısa, net, Türkçe)",
      "suggestedAction": "Ne yapılmalı? (somut eylem, Türkçe)",
      "channel": "call veya whatsapp veya email",
      "urgencyLevel": "high veya medium veya low"
    }
  ],
  "insights": "Bugünün genel satış durumu ve öneriler (2-3 cümle, Türkçe)",
  "todaysPriority": "Bugün en kritik tek eylem nedir? (1 cümle, Türkçe)"
}
Maksimum 5 acil temas öner. Sadece JSON döndür.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.5,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) throw new Error("Gemini: " + res.status);
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // JSON parse
    const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json(getMockBriefing());

    const briefing = JSON.parse(match[0]);
    if (!briefing.urgentContacts) return NextResponse.json(getMockBriefing());

    return NextResponse.json({ ...briefing, source: "gemini", generatedAt: now.toISOString() });
  } catch (e) {
    console.error("Daily briefing hatası:", e);
    return NextResponse.json(getMockBriefing());
  }
}

function getMockBriefing() {
  return {
    urgentContacts: [
      {
        customerId: "",
        name: "Ege Tarım A.Ş.",
        reason: "7 gündür temas yok, aktif müşteri",
        suggestedAction: "WhatsApp ile ürün güncelleme mesajı gönder",
        channel: "whatsapp",
        urgencyLevel: "high",
      },
      {
        customerId: "",
        name: "Konya Tahıl Üreticileri",
        reason: "Teklif bekleniyor, potansiyel yüksek",
        suggestedAction: "Telefon ile takip et, fiyat teklifi ver",
        channel: "call",
        urgencyLevel: "high",
      },
      {
        customerId: "",
        name: "Adana Narenciye San.",
        reason: "Email bounce aldı, iletişim kesildi",
        suggestedAction: "Telefon ile ulaş, iletişim bilgilerini güncelle",
        channel: "call",
        urgencyLevel: "medium",
      },
    ],
    insights: "Bugün 2 gecikmiş sekans adımı var. Aktif müşterilerde son 7 günde temas düşüş gösterdi. Aday müşterilerde takip oranı artırılmalı.",
    todaysPriority: "Konya Tahıl Üreticileri'ni ara ve teklif sun — satın alma kararı bu haftaya sarkabilir.",
    source: "mock",
    generatedAt: new Date().toISOString(),
  };
}
