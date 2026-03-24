// Meta Instagram Messaging API
// Docs: https://developers.facebook.com/docs/messenger-platform/instagram

const FB_API_VERSION = "v21.0";
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

export function isInstagramConfigured(): boolean {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  return !!(
    token &&
    igAccountId &&
    !token.startsWith("your_") &&
    !igAccountId.startsWith("your_")
  );
}

/**
 * Instagram Business DM gönderir.
 * recipientIgScopedId: Instagram-Scoped User ID (webhook'tan gelir)
 */
export async function sendInstagramDM(
  recipientIgScopedId: string,
  messageText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const igAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!token || !igAccountId) {
    return { success: false, error: "Instagram API yapılandırılmamış" };
  }

  try {
    const res = await fetch(
      `${FB_BASE}/${igAccountId}/messages?access_token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: recipientIgScopedId },
          message: { text: messageText },
          messaging_type: "RESPONSE",
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Instagram DM send error:", data);
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

export interface IncomingInstagramMessage {
  senderIgId: string;   // Instagram-Scoped User ID
  igAccountId: string;
  messageId: string;
  timestamp: number;
  text: string;
}

/**
 * Instagram webhook payload'ından gelen DM'i parse eder.
 * Instagram webhook formatı WhatsApp ile farklı, Messenger ile aynı (page object).
 */
export function parseInstagramWebhook(
  body: Record<string, unknown>
): IncomingInstagramMessage | null {
  try {
    if (body.object !== "instagram") return null;

    const entry = (body.entry as Record<string, unknown>[])?.[0];
    const messaging = (entry?.messaging as Record<string, unknown>[])?.[0];

    if (!messaging) return null;

    const message = messaging.message as Record<string, unknown> | undefined;
    if (!message || message.is_echo) return null;

    const text = message.text as string | undefined;
    if (!text) return null;

    const sender = messaging.sender as Record<string, unknown>;
    const recipient = messaging.recipient as Record<string, unknown>;

    return {
      senderIgId: sender.id as string,
      igAccountId: recipient.id as string,
      messageId: message.mid as string,
      timestamp: messaging.timestamp as number,
      text,
    };
  } catch {
    return null;
  }
}
