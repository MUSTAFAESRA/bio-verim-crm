// Meta WhatsApp Business Cloud API — https://developers.facebook.com/docs/whatsapp/cloud-api

const WA_API_VERSION = "v21.0";
const WA_BASE = `https://graph.facebook.com/${WA_API_VERSION}`;

export function isWhatsAppConfigured(): boolean {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return !!(token && phoneId && !token.startsWith("your_") && !phoneId.startsWith("your_"));
}

/**
 * Türkiye numarasını WhatsApp formatına çevirir.
 * 05xx → 905xx
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return "9" + digits;
  if (digits.startsWith("5")) return "90" + digits;
  return digits;
}

/**
 * WhatsApp'tan gelen telefon numarasını CRM formatına çevirir.
 * 905xx → 05xx
 */
export function normalizePhoneFromWhatsApp(waPhone: string): string {
  const digits = waPhone.replace(/\D/g, "");
  if (digits.startsWith("90")) return "0" + digits.slice(2);
  return digits;
}

/**
 * Meta Cloud API ile WhatsApp mesajı gönderir.
 * Müşteri telefon numarası + mesaj içeriği alır.
 */
export async function sendWhatsAppMessage(
  toPhone: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { success: false, error: "WhatsApp API yapılandırılmamış" };
  }

  const formattedPhone = formatPhoneForWhatsApp(toPhone);

  try {
    const res = await fetch(`${WA_BASE}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { preview_url: false, body: messageText },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("WhatsApp send error:", data);
      return {
        success: false,
        error: data?.error?.message ?? `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      messageId: data?.messages?.[0]?.id,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Meta webhook mesaj payload'ından gelen mesajı parse eder.
 */
export interface IncomingWhatsAppMessage {
  from: string;        // 905xxxxxxxxx
  messageId: string;
  timestamp: string;
  text: string;
  profileName: string;
}

export function parseWhatsAppWebhook(body: Record<string, unknown>): IncomingWhatsAppMessage | null {
  try {
    const entry = (body.entry as Record<string, unknown>[])?.[0];
    const change = (entry?.changes as Record<string, unknown>[])?.[0];
    const value = change?.value as Record<string, unknown>;
    const messages = value?.messages as Record<string, unknown>[];
    const contacts = value?.contacts as Record<string, unknown>[];

    if (!messages?.length) return null;

    const msg = messages[0];
    const contact = contacts?.[0];

    if (msg.type !== "text") return null; // Şimdilik sadece metin mesajları

    const text = (msg.text as Record<string, unknown>)?.body as string;
    const profileName = (contact?.profile as Record<string, unknown>)?.name as string ?? "";

    return {
      from: msg.from as string,
      messageId: msg.id as string,
      timestamp: msg.timestamp as string,
      text,
      profileName,
    };
  } catch {
    return null;
  }
}
