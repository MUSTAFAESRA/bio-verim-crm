const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

const PLATFORM_EMOJI: Record<string, string> = {
  linkedin: "💼",
  facebook: "📘",
  instagram: "📸",
};

export function isTelegramConfigured(): boolean {
  return !!(BOT_TOKEN && BOT_TOKEN !== "your_telegram_bot_token" && CHAT_ID && CHAT_ID !== "your_telegram_chat_id");
}

export async function sendApprovalMessage(opts: {
  postId: string;
  platform: string;
  content: string;
  scheduledAt?: string | null;
  instruction?: string | null;
  mediaUrl?: string | null;
}): Promise<string | null> {
  if (!isTelegramConfigured()) return null;

  const { postId, platform, content, scheduledAt, instruction, mediaUrl } = opts;
  const emoji = PLATFORM_EMOJI[platform] || "📣";
  const preview = content.length > 300 ? content.substring(0, 300) + "..." : content;

  const timeInfo = scheduledAt
    ? `⏰ *Yayın Zamanı:* ${new Date(scheduledAt).toLocaleString("tr-TR")}`
    : `⚡ *Hemen yayınlanacak*`;

  const instrInfo = instruction?.trim()
    ? `\n📋 *Talimat:* ${instruction}`
    : "";

  const text = [
    `${emoji} *${platform.toUpperCase()} POST ONAYI İSTEĞİ*`,
    ``,
    `📝 *İçerik:*`,
    `\`\`\``,
    preview,
    `\`\`\``,
    ``,
    timeInfo,
    instrInfo,
    ``,
    `🆔 Post ID: \`${postId}\``,
  ].filter(Boolean).join("\n");

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "✅ Onayla & Yayınla", callback_data: `approve:${postId}` },
        { text: "❌ Reddet", callback_data: `reject:${postId}` },
      ],
    ],
  };

  try {
    let res: Response;
    const isImage = mediaUrl && !mediaUrl.match(/\.(mp4|mov|avi|webm|mkv)/i);
    const isVideo = mediaUrl && mediaUrl.match(/\.(mp4|mov|avi|webm|mkv)/i);

    if (isImage) {
      // Görsel varsa sendPhoto — Telegram görsel önizleme gösterir
      res = await fetch(`${BASE}/sendPhoto`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          photo: mediaUrl,
          caption: text,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        }),
      });
      const photoData = await res.json();
      if (photoData.ok) return String(photoData.result.message_id);
      // sendPhoto başarısız olursa (URL erişilemeyen Supabase linki vs.) sendMessage'a düş
    }

    if (isVideo) {
      // Video varsa metne URL ekleyip sendMessage kullan
      const videoText = text + `\n\n🎬 *Video:* ${mediaUrl}`;
      res = await fetch(`${BASE}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: videoText,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        }),
      });
    } else {
      // Görsel yok veya sendPhoto başarısız → düz mesaj
      res = await fetch(`${BASE}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        }),
      });
    }
    const data = await res.json();
    if (data.ok) return String(data.result.message_id);
    return null;
  } catch {
    return null;
  }
}

export async function editApprovalMessage(messageId: string, text: string): Promise<void> {
  if (!isTelegramConfigured() || !messageId) return;
  try {
    await fetch(`${BASE}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        message_id: Number(messageId),
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch {}
}

export async function answerCallbackQuery(callbackQueryId: string, text: string): Promise<void> {
  if (!isTelegramConfigured()) return;
  try {
    await fetch(`${BASE}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch {}
}
