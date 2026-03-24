import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

// Sekans adımı mesajını müşteri geçmişine göre kişiselleştirir
export async function POST(req: NextRequest) {
  const { customerId, customerName, stepTemplate, stepNo, seqName, channel } =
    await req.json();

  const geminiKey = process.env.GEMINI_API_KEY;

  // AI yoksa düz şablon döndür
  if (!geminiKey || geminiKey.startsWith("your_")) {
    return NextResponse.json({
      personalizedMessage: stepTemplate,
      source: "template",
    });
  }

  const supabase = await createClient();

  // Müşterinin son 5 temas geçmişi
  let historyText = "İlk temas — geçmiş kayıt yok.";
  if (customerId) {
    const { data: logs } = await supabase
      .from("contact_logs")
      .select("contact_type, notes, outcome, contacted_at")
      .eq("customer_id", customerId)
      .order("contacted_at", { ascending: false })
      .limit(5);

    if (logs && logs.length > 0) {
      historyText = (
        logs as Array<{
          contact_type: string;
          notes: string | null;
          outcome: string | null;
          contacted_at: string;
        }>
      )
        .map(
          (l, i) =>
            `${i + 1}. [${new Date(l.contacted_at).toLocaleDateString("tr-TR")}] ${l.contact_type}: ${l.notes?.slice(0, 120) ?? "—"} → ${l.outcome ?? "—"}`
        )
        .join("\n");
    }
  }

  const channelTone: Record<string, string> = {
    linkedin_dm: "Profesyonel LinkedIn DM tonu. Samimi ama kurumsal. Kısa tutun.",
    instagram: "Instagram DM tonu. Samimi, emoji ekleyebilirsin. Kısa.",
    facebook_dm: "Facebook Messenger tonu. Günlük, samimi. Kısa.",
    whatsapp: "WhatsApp tonu. Çok kısa ve doğal.",
    email: "Profesyonel e-posta. İlk satır [KONU]: ile başlasın.",
  };

  const maxWords: Record<string, number> = {
    linkedin_dm: 100,
    instagram: 80,
    facebook_dm: 80,
    whatsapp: 60,
    email: 150,
  };

  const prompt = `Bioverim Gübre ve Tarım Ürünleri A.Ş. satış temsilcisi olarak, aşağıdaki mesaj şablonunu ${customerName} için kişiselleştir.

MÜŞTERİ: ${customerName}
KANAL: ${channel}
SEKANS: ${seqName}
ADIM: ${stepNo}

MESAJ ŞABLONU:
${stepTemplate}

MÜŞTERİ GEÇMİŞİ (son 5 temas):
${historyText}

KURALLAR:
- ${channelTone[channel] ?? "Kısa ve samimi."}
- Maksimum ${maxWords[channel] ?? 80} kelime
- {{musteri_adi}} yerine "${customerName}" yaz
- {{urun_adi}} yerine "Bio Verim Sıvı Gübre" yaz
- {{tarih}} yerine "${new Date().toLocaleDateString("tr-TR")}" yaz
- {{fiyat}} yerine "fiyat için irtibata geçin" yaz
- Geçmiş temasları varsa kısaca referans al (örn: "geçen görüştüğümüzde...")
- Şablonun yapısını koru, sadece kişiselleştir
- Sadece kişiselleştirilmiş mesajı yaz, açıklama ekleme`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.65,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) throw new Error("Gemini: " + res.status);
    const data = await res.json();
    const personalizedMessage: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? stepTemplate;

    return NextResponse.json({ personalizedMessage, source: "gemini" });
  } catch (e) {
    console.error("Kişiselleştirme hatası:", e);
    return NextResponse.json({
      personalizedMessage: stepTemplate,
      source: "template",
    });
  }
}
