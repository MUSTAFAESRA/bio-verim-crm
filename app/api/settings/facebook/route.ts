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
  const pageToken = env.FACEBOOK_PAGE_ACCESS_TOKEN ?? "";
  const pageId = env.FACEBOOK_PAGE_ID ?? "";
  const instagramBusinessAccountId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";
  const autoReply = env.FACEBOOK_AUTO_REPLY ?? "false";
  const instagramAutoReply = env.INSTAGRAM_AUTO_REPLY ?? "false";
  const verifyToken = env.FACEBOOK_VERIFY_TOKEN ?? "bio-verim-facebook-2024";

  const isConfigured = (v: string) => !!(v && !v.startsWith("your_") && v.length > 10);

  return NextResponse.json({
    pageTokenConfigured: isConfigured(pageToken),
    pageTokenMasked: pageToken ? pageToken.slice(0, 8) + "..." + pageToken.slice(-4) : "",
    pageId: isConfigured(pageId) ? pageId : "",
    pageIdConfigured: isConfigured(pageId),
    instagramBusinessAccountId: isConfigured(instagramBusinessAccountId) ? instagramBusinessAccountId : "",
    instagramConfigured: isConfigured(instagramBusinessAccountId),
    autoReply: autoReply === "true",
    instagramAutoReply: instagramAutoReply === "true",
    verifyToken,
  });
}

// POST: ayarları güncelle + bağlantıyı test et
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "save") {
    const { pageAccessToken, pageId, instagramBusinessAccountId, facebookAutoReply, instagramAutoReply, webhookUrl } = body;
    const updates: Record<string, string> = {};
    if (pageAccessToken) updates.FACEBOOK_PAGE_ACCESS_TOKEN = pageAccessToken;
    if (pageId) updates.FACEBOOK_PAGE_ID = pageId;
    if (instagramBusinessAccountId) updates.INSTAGRAM_BUSINESS_ACCOUNT_ID = instagramBusinessAccountId;
    if (typeof facebookAutoReply === "boolean") updates.FACEBOOK_AUTO_REPLY = facebookAutoReply ? "true" : "false";
    if (typeof instagramAutoReply === "boolean") updates.INSTAGRAM_AUTO_REPLY = instagramAutoReply ? "true" : "false";
    if (webhookUrl) updates.FACEBOOK_WEBHOOK_URL = webhookUrl;
    updates.FACEBOOK_VERIFY_TOKEN = "bio-verim-facebook-2024";

    writeEnv(updates);

    return NextResponse.json({ success: true, message: "Ayarlar kaydedildi. Sunucu yeniden başlatılıyor..." });
  }

  if (action === "test") {
    const token = body.pageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const pageId = body.pageId || process.env.FACEBOOK_PAGE_ID;

    if (!token || token.startsWith("your_")) {
      return NextResponse.json({ success: false, error: "Page Access Token girilmemiş" });
    }

    if (!pageId || pageId.startsWith("your_")) {
      return NextResponse.json({ success: false, error: "Page ID girilmemiş" });
    }

    try {
      const pageRes = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=name,id`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const pageData = await pageRes.json();

      if (!pageRes.ok || pageData.error) {
        return NextResponse.json({
          success: false,
          error: pageData.error?.message ?? "Token veya Page ID geçersiz",
        });
      }

      return NextResponse.json({
        success: true,
        pageName: pageData.name ?? null,
        pageId: pageData.id ?? null,
      });
    } catch (e) {
      return NextResponse.json({ success: false, error: (e as Error).message });
    }
  }

  if (action === "restart") {
    const { exec } = await import("child_process");
    exec("pm2 restart bio-verim-crm --update-env");
    return NextResponse.json({ success: true, message: "Sunucu yeniden başlatılıyor..." });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
