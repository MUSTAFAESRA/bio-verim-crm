import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ENV_PATH = path.join(process.cwd(), ".env.local");

function readEnv(): Record<string, string> {
  if (!fs.existsSync(ENV_PATH)) return {};
  const lines = fs.readFileSync(ENV_PATH, "utf-8").split("\n");
  const result: Record<string, string> = {};
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) result[match[1].trim()] = match[2].trim();
  }
  return result;
}

function writeEnv(updates: Record<string, string>): void {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf-8") : "";
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`;
    }
  }
  fs.writeFileSync(ENV_PATH, content, "utf-8");
}

// GET: mevcut durumu döndür (token maskeli)
export async function GET() {
  const env = readEnv();
  const token = env.WHATSAPP_ACCESS_TOKEN ?? "";
  const phoneId = env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  const verifyToken = env.WHATSAPP_VERIFY_TOKEN ?? "bio-verim-whatsapp-2024";
  const autoReply = env.WHATSAPP_AUTO_REPLY ?? "false";
  const tunnelUrl = env.WHATSAPP_WEBHOOK_URL ?? "";

  const isConfigured = (v: string) => !!(v && !v.startsWith("your_") && v.length > 10);

  return NextResponse.json({
    tokenConfigured: isConfigured(token),
    tokenMasked: token ? token.slice(0, 8) + "..." + token.slice(-4) : "",
    phoneIdConfigured: isConfigured(phoneId),
    phoneId: isConfigured(phoneId) ? phoneId : "",
    verifyToken,
    autoReply: autoReply === "true",
    tunnelUrl,
  });
}

// POST: ayarları güncelle + bağlantıyı test et
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "save") {
    const { accessToken, phoneNumberId, verifyToken, autoReply, webhookUrl } = body;
    const updates: Record<string, string> = {};
    if (accessToken) updates.WHATSAPP_ACCESS_TOKEN = accessToken;
    if (phoneNumberId) updates.WHATSAPP_PHONE_NUMBER_ID = phoneNumberId;
    if (verifyToken) updates.WHATSAPP_VERIFY_TOKEN = verifyToken;
    if (typeof autoReply === "boolean") updates.WHATSAPP_AUTO_REPLY = autoReply ? "true" : "false";
    if (webhookUrl) updates.WHATSAPP_WEBHOOK_URL = webhookUrl;

    writeEnv(updates);

    // .env.local değişince process.env de güncellenmeli — sonraki istekte aktif olur
    return NextResponse.json({ success: true, message: "Ayarlar kaydedildi. Sunucu yeniden başlatılıyor..." });
  }

  if (action === "test") {
    // Meta Graph API'ye token ile istek at — geçerliyse telefon listesi döner
    const token = body.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = body.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || token.startsWith("your_")) {
      return NextResponse.json({ success: false, error: "Access Token girilmemiş" });
    }

    try {
      // Token doğrulaması: /me endpoint'i
      const meRes = await fetch("https://graph.facebook.com/v21.0/me?fields=id,name", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();

      if (!meRes.ok || meData.error) {
        return NextResponse.json({
          success: false,
          error: meData.error?.message ?? "Token geçersiz",
        });
      }

      // Phone Number ID doğrulama
      let phoneInfo = null;
      if (phoneId && !phoneId.startsWith("your_")) {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}?fields=display_phone_number,verified_name,quality_rating`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        phoneInfo = await phoneRes.json();
      }

      return NextResponse.json({
        success: true,
        account: meData.name ?? meData.id,
        phone: phoneInfo?.display_phone_number ?? null,
        verifiedName: phoneInfo?.verified_name ?? null,
        qualityRating: phoneInfo?.quality_rating ?? null,
      });
    } catch (e) {
      return NextResponse.json({ success: false, error: (e as Error).message });
    }
  }

  if (action === "restart") {
    // pm2 restart — komut çalıştır
    const { exec } = await import("child_process");
    exec("pm2 restart bio-verim-crm --update-env");
    return NextResponse.json({ success: true, message: "Sunucu yeniden başlatılıyor..." });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
