import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export const maxDuration = 30;

// Gelen mesaja AI ile yanıt önerisi üretir — isteğe bağlı otomatik gönderir
export async function POST(req: NextRequest) {
  const { customerId, customerName, phone, incomingMessage, autoSend } = await req.json();

  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || geminiKey.startsWith("your_")) {
    return NextResponse.json({ error: "Gemini API yapılandırılmamış" }, { status: 500 });
  }

  const supabase = await createClient();

  // Müşterinin son 5 temas geçmişini çek
  let history = "İlk temas";
  if (customerId) {
    const { data: logs } = await supabase
      .from("contact_logs")
      .select("contact_type, notes, outcome, contacted_at")
      .eq("customer_id", customerId)
      .order("contacted_at", { ascending: false })
      .limit(5);

    if (logs && logs.length > 0) {
      history = (logs as Array<{ contact_type: string; notes: string | null; outcome: string | null; contacted_at: string }>)
        .map((l, i) => `${i + 1}. [${new Date(l.contacted_at).toLocaleDateString("tr-TR")}] ${l.contact_type}: ${l.notes ?? "—"} → ${l.outcome ?? "—"}`)
        .join("\n");
    }
  }

  const prompt = `Sen Bioverim Gübre ve Tarım Ürünleri A.Ş. adına WhatsApp'ta müşterilerle iletişim kuran bir satış asistanısın.

MÜŞTERİ: ${customerName}
GELEN MESAJ: "${incomingMessage}"

GEÇMIŞ TEMAS (son 5):
${history}

GÖREV:
- Kısa, samimi, WhatsApp tonunda bir yanıt yaz (maksimum 3 cümle)
- Gübre/tarım sektörüne uygun dil kullan
- Müşterinin sorusunu veya isteğini doğrudan karşıla
- Gerekirse ürün hakkında bilgi ver, fiyat için "detay için irtibata geçelim" de
- Sadece yanıt metnini yaz, başka açıklama ekleme`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) throw new Error("Gemini API: " + res.status);
    const data = await res.json();
    const replyText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!replyText) {
      return NextResponse.json({ error: "AI boş yanıt döndürdü" }, { status: 500 });
    }

    let sent = false;
    let sendError: string | undefined;

    // Otomatik gönder seçeneği aktifse WhatsApp'tan gönder
    if (autoSend && phone) {
      const result = await sendWhatsAppMessage(phone, replyText);
      sent = result.success;
      sendError = result.error;

      if (sent) {
        // Gönderimi logla
        await supabase.from("contact_logs").insert({
          customer_id: customerId,
          contact_type: "whatsapp",
          direction: "outbound",
          subject: `[AI Yanıt] ${customerName}`,
          notes: replyText,
          contacted_at: new Date().toISOString(),
          outcome: "follow_up",
          created_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      reply: replyText,
      sent,
      sendError,
    });
  } catch (e) {
    console.error("AI yanıt hatası:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
