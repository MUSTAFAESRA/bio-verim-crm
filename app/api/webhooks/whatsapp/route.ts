import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { parseWhatsAppWebhook, normalizePhoneFromWhatsApp, sendWhatsAppMessage } from "@/lib/whatsapp";

// ── GET: Meta webhook doğrulama ──────────────────────────────────────────────
// Meta bu URL'ye GET isteği atar, biz hub.challenge'ı geri döndürürüz.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "bio-verim-whatsapp";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp webhook doğrulandı");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: Gelen WhatsApp mesajları ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Sadece WhatsApp Business mesajları işle
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true });
  }

  const message = parseWhatsAppWebhook(body);
  if (!message) {
    return NextResponse.json({ received: true }); // Okundu bildirimi veya medya — atla
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Supabase yapılandırılmamışsa sadece logla
  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !serviceKey || serviceKey.includes("placeholder")) {
    console.log("WhatsApp mesajı alındı (Supabase yapılandırılmamış):", message);
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient(supabaseUrl, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  // Telefon numarasına göre müşteri bul
  const normalizedPhone = normalizePhoneFromWhatsApp(message.from);
  const phoneVariants = [
    normalizedPhone,
    message.from,
    normalizedPhone.replace(/^0/, "+90"),
    "0" + message.from.slice(2), // 90xxxx → 0xxxx
  ];

  let customerId: string | null = null;
  let customerName = message.profileName;

  for (const phone of phoneVariants) {
    const { data } = await supabase
      .from("customers")
      .select("id, company_name, contact_name")
      .eq("phone", phone)
      .single();

    if (data) {
      customerId = (data as { id: string; company_name: string; contact_name: string | null }).id;
      customerName = (data as { id: string; company_name: string; contact_name: string | null }).company_name
        || (data as { id: string; company_name: string; contact_name: string | null }).contact_name
        || message.profileName;
      break;
    }
  }

  // Gelen mesajı contact_logs'a kaydet
  const now = new Date();
  await supabase.from("contact_logs").insert({
    customer_id: customerId,
    contact_type: "whatsapp",
    direction: "inbound",
    subject: `WhatsApp: ${customerName} (${normalizedPhone})`,
    notes: message.text,
    contacted_at: now.toISOString(),
    outcome: "follow_up",
    next_action: "AI yanıt önerisi oluştur",
    created_at: now.toISOString(),
  });

  // ── AI otomatik yanıt ────────────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  const autoReply = process.env.WHATSAPP_AUTO_REPLY === "true";

  if (geminiKey && !geminiKey.startsWith("your_")) {
    try {
      // Müşterinin son 5 temas geçmişini al
      let history = "";
      if (customerId) {
        const { data: logs } = await supabase
          .from("contact_logs")
          .select("contact_type, subject, notes, outcome, contacted_at")
          .eq("customer_id", customerId)
          .order("contacted_at", { ascending: false })
          .limit(5);

        if (logs?.length) {
          history = logs.map((l: Record<string, unknown>, i: number) =>
            `${i + 1}. [${new Date(l.contacted_at as string).toLocaleDateString("tr-TR")}] ${l.contact_type} — ${l.notes}`
          ).join("\n");
        }
      }

      const prompt = `Sen Bioverim Gübre ve Tarım Ürünleri A.Ş. adına WhatsApp'ta müşterilerle iletişim kuran bir satış asistanısın.

MÜŞTERİ: ${customerName}
GELEN MESAJ: "${message.text}"

GEÇMIŞ TEMAS (son 5):
${history || "İlk temas"}

GÖREV:
- Kısa, samimi, WhatsApp tonunda bir yanıt yaz (maksimum 3 cümle)
- Gübre/tarım sektörüne uygun dil kullan
- Müşterinin sorusunu veya isteğini karşıla
- Gerekirse ürün hakkında bilgi ver veya görüşme teklif et
- Sadece yanıt metnini yaz, başka açıklama ekleme`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 300, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        if (aiReply) {
          // AI yanıtını log'a kaydet
          await supabase.from("contact_logs").insert({
            customer_id: customerId,
            contact_type: "whatsapp",
            direction: "outbound",
            subject: `[AI Yanıt] ${customerName}`,
            notes: aiReply,
            contacted_at: new Date().toISOString(),
            outcome: "follow_up",
            created_at: new Date().toISOString(),
          });

          // Otomatik gönderim aktifse gerçekten gönder
          if (autoReply) {
            await sendWhatsAppMessage(message.from, aiReply);
          }
        }
      }
    } catch (e) {
      console.error("AI yanıt hatası:", e);
    }
  }

  return NextResponse.json({ received: true });
}
