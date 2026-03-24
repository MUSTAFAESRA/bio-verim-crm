import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { parseMessengerWebhook, sendMessengerMessage, isMessengerConfigured } from "@/lib/facebook-messenger";

// ── GET: Meta webhook doğrulama ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN ?? "bio-verim-facebook-2024";

  if (mode === "subscribe" && token === verifyToken) {
    console.log("Facebook Messenger webhook doğrulandı");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// ── POST: Gelen Facebook Messenger mesajları ─────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = parseMessengerWebhook(body);
  if (!message) {
    return NextResponse.json({ received: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !serviceKey || serviceKey.includes("placeholder")) {
    console.log("Facebook Messenger mesajı alındı (Supabase yapılandırılmamış):", message);
    return NextResponse.json({ received: true });
  }

  const supabase = createServerClient(supabaseUrl, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  // PSID ile müşteri bul — varsa güncelle, yoksa null bırak
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, company_name, contact_name, facebook_psid")
    .eq("facebook_psid", message.senderPsid)
    .single();

  let customerId: string | null = null;
  let customerName = "Facebook Kullanıcısı";

  if (existingCustomer) {
    customerId = (existingCustomer as { id: string; company_name: string; contact_name: string | null; facebook_psid: string | null }).id;
    customerName = (existingCustomer as { id: string; company_name: string; contact_name: string | null; facebook_psid: string | null }).company_name
      || (existingCustomer as { id: string; company_name: string; contact_name: string | null; facebook_psid: string | null }).contact_name
      || customerName;
  }

  // Gelen mesajı contact_logs'a kaydet
  const now = new Date();
  await supabase.from("contact_logs").insert({
    customer_id: customerId,
    contact_type: "other",
    direction: "inbound",
    subject: `Facebook Messenger: ${customerName} (PSID: ${message.senderPsid.slice(-6)})`,
    notes: message.text,
    contacted_at: now.toISOString(),
    outcome: "follow_up",
    next_action: "AI yanıt gönderildi",
    created_at: now.toISOString(),
  });

  // ── Gemini AI otomatik yanıt ─────────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY;
  const autoReply = process.env.FACEBOOK_AUTO_REPLY === "true";

  if (geminiKey && !geminiKey.startsWith("your_") && isMessengerConfigured()) {
    try {
      let history = "İlk temas";
      if (customerId) {
        const { data: logs } = await supabase
          .from("contact_logs")
          .select("contact_type, notes, outcome, contacted_at")
          .eq("customer_id", customerId)
          .order("contacted_at", { ascending: false })
          .limit(5);

        if (logs?.length) {
          history = (logs as Array<{ contact_type: string; notes: string | null; outcome: string | null; contacted_at: string }>)
            .map((l, i) =>
              `${i + 1}. [${new Date(l.contacted_at).toLocaleDateString("tr-TR")}] ${l.contact_type}: ${l.notes ?? "—"}`
            ).join("\n");
        }
      }

      const prompt = `Sen Bioverim Gübre ve Tarım Ürünleri A.Ş. adına Facebook Messenger'da müşterilerle iletişim kuran bir satış asistanısın.

MÜŞTERİ: ${customerName}
GELEN MESAJ: "${message.text}"

GEÇMIŞ TEMAS (son 5):
${history}

GÖREV:
- Kısa, samimi, Messenger tonunda bir yanıt yaz (maksimum 3 cümle)
- Gübre/tarım sektörüne uygun dil kullan
- Müşterinin sorusunu veya isteğini karşıla
- Gerekirse ürün hakkında bilgi ver veya görüşme teklif et
- Satın alma isteği varsa "sizi hemen arayalım" ekle
- Sadece yanıt metnini yaz, başka açıklama ekleme`;

      const geminiRes = await fetch(
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

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const aiReply: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        if (aiReply) {
          // AI yanıtını logla
          await supabase.from("contact_logs").insert({
            customer_id: customerId,
            contact_type: "other",
            direction: "outbound",
            subject: `[AI Yanıt] Facebook: ${customerName}`,
            notes: aiReply,
            contacted_at: new Date().toISOString(),
            outcome: "follow_up",
            created_at: new Date().toISOString(),
          });

          // Otomatik gönder
          if (autoReply) {
            await sendMessengerMessage(message.senderPsid, aiReply);
          }
        }
      }
    } catch (e) {
      console.error("Facebook AI yanıt hatası:", e);
    }
  }

  return NextResponse.json({ received: true });
}
