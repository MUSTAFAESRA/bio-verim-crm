// Meta Facebook Messenger Platform API
// Docs: https://developers.facebook.com/docs/messenger-platform

const FB_API_VERSION = "v21.0";
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

export function isMessengerConfigured(): boolean {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;
  return !!(token && pageId && !token.startsWith("your_") && !pageId.startsWith("your_"));
}

/**
 * Facebook Messenger'a mesaj gönderir.
 * recipientPsid: Page-Scoped User ID (webhook'tan gelir, telefon değil)
 */
export async function sendMessengerMessage(
  recipientPsid: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!token || !pageId) {
    return { success: false, error: "Facebook Messenger API yapılandırılmamış" };
  }

  try {
    const res = await fetch(`${FB_BASE}/${pageId}/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text: messageText },
        messaging_type: "RESPONSE",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Messenger send error:", data);
      return {
        success: false,
        error: data?.error?.message ?? `HTTP ${res.status}`,
      };
    }

    return { success: true, messageId: data?.message_id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export interface IncomingMessengerMessage {
  senderPsid: string;   // Page-Scoped User ID
  pageId: string;
  messageId: string;
  timestamp: number;
  text: string;
}

/**
 * Facebook Messenger webhook payload'ından mesajı parse eder.
 * Meta webhook formatı: entry[0].messaging[0].message.text
 */
export function parseMessengerWebhook(
  body: Record<string, unknown>
): IncomingMessengerMessage | null {
  try {
    if (body.object !== "page") return null;

    const entry = (body.entry as Record<string, unknown>[])?.[0];
    const messaging = (entry?.messaging as Record<string, unknown>[])?.[0];

    if (!messaging) return null;

    const message = messaging.message as Record<string, unknown> | undefined;
    if (!message || message.is_echo) return null; // Kendi gönderdiğimiz mesajları atla

    const text = message.text as string | undefined;
    if (!text) return null; // Medya mesajları atla

    const sender = messaging.sender as Record<string, unknown>;
    const recipient = messaging.recipient as Record<string, unknown>;

    return {
      senderPsid: sender.id as string,
      pageId: recipient.id as string,
      messageId: message.mid as string,
      timestamp: messaging.timestamp as number,
      text,
    };
  } catch {
    return null;
  }
}
