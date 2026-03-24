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

// GET: mevcut durumu döndür (API key maskeli)
export async function GET() {
  const env = readEnv();
  const resendKey = env.RESEND_API_KEY ?? "";
  const fromEmail = env.RESEND_FROM_EMAIL ?? "";

  const isConfigured = (v: string) => !!(v && !v.startsWith("your_") && v.length > 10);

  return NextResponse.json({
    resendConfigured: isConfigured(resendKey),
    resendKeyMasked: resendKey ? resendKey.slice(0, 8) + "..." + resendKey.slice(-4) : "",
    fromEmail: fromEmail,
  });
}

// POST: ayarları güncelle + bağlantıyı test et
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === "save") {
    const { resendApiKey, fromEmail } = body;
    const updates: Record<string, string> = {};
    if (resendApiKey) updates.RESEND_API_KEY = resendApiKey;
    if (fromEmail) updates.RESEND_FROM_EMAIL = fromEmail;

    writeEnv(updates);

    return NextResponse.json({ success: true, message: "Ayarlar kaydedildi. Sunucu yeniden başlatılıyor..." });
  }

  if (action === "test") {
    const env = readEnv();
    const apiKey = body.resendApiKey || env.RESEND_API_KEY || process.env.RESEND_API_KEY;
    const fromEmail = body.fromEmail || env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL;

    if (!apiKey || apiKey.startsWith("your_")) {
      return NextResponse.json({ success: false, error: "Resend API Key girilmemiş" });
    }

    if (!fromEmail) {
      return NextResponse.json({ success: false, error: "Gönderici e-posta adresi girilmemiş" });
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: fromEmail,
          subject: "Bio Verim CRM — Test E-postası",
          html: "<p>Bu bir test e-postasıdır. E-posta entegrasyonunuz başarıyla çalışıyor.</p>",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.statusCode >= 400) {
        return NextResponse.json({
          success: false,
          error: data.message ?? data.name ?? "E-posta gönderilemedi",
        });
      }

      return NextResponse.json({ success: true, message: "Test e-postası başarıyla gönderildi" });
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
