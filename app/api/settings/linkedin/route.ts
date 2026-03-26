import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const ENV_PATH = path.join(process.cwd(), ".env.local");

// Check if configured
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  if (searchParams.get("check") === "true") {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const orgId = process.env.LINKEDIN_ORGANIZATION_ID;
    const configured =
      !!token && token !== "your_linkedin_access_token" &&
      !!orgId && orgId !== "your_linkedin_organization_id";
    return NextResponse.json({ configured });
  }

  const token = process.env.LINKEDIN_ACCESS_TOKEN || "";
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID || "";
  return NextResponse.json({
    tokenConfigured: !!token && token !== "your_linkedin_access_token",
    orgIdConfigured: !!orgId && orgId !== "your_linkedin_organization_id",
    tokenMasked: token ? `****${token.slice(-4)}` : "",
    orgId: orgId !== "your_linkedin_organization_id" ? orgId : "",
  });
}

export async function POST(req: NextRequest) {
  const { action, accessToken, organizationId } = await req.json();

  if (action === "save") {
    try {
      let content = "";
      try {
        content = await fs.readFile(ENV_PATH, "utf8");
      } catch { content = ""; }

      const updates: Record<string, string> = {};
      if (accessToken) updates["LINKEDIN_ACCESS_TOKEN"] = accessToken;
      if (organizationId) updates["LINKEDIN_ORGANIZATION_ID"] = organizationId;

      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          content = content.replace(regex, `${key}=${value}`);
        } else {
          content += `\n${key}=${value}`;
        }
      }

      await fs.writeFile(ENV_PATH, content.trimStart(), "utf8");
      return NextResponse.json({ ok: true, message: "Ayarlar kaydedildi." });
    } catch (err) {
      return NextResponse.json({ ok: false, message: String(err) }, { status: 500 });
    }
  }

  if (action === "test") {
    const token = accessToken || process.env.LINKEDIN_ACCESS_TOKEN;
    const orgId = organizationId || process.env.LINKEDIN_ORGANIZATION_ID;

    if (!token) {
      return NextResponse.json({ ok: false, message: "Access Token girilmedi." }, { status: 400 });
    }

    try {
      // Test token via /me endpoint
      const meRes = await fetch("https://api.linkedin.com/v2/me", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Restli-Protocol-Version": "2.0.0",
        },
      });
      const meData = await meRes.json();

      if (!meRes.ok || meData.status === 401) {
        return NextResponse.json({ ok: false, message: "Token geçersiz veya süresi dolmuş." }, { status: 400 });
      }

      let orgName = "";
      if (orgId) {
        const orgRes = await fetch(`https://api.linkedin.com/v2/organizations/${orgId}?projection=(localizedName)`, {
          headers: { Authorization: `Bearer ${token}`, "X-Restli-Protocol-Version": "2.0.0" },
        });
        const orgData = await orgRes.json();
        orgName = orgData.localizedName || "";
      }

      const firstName = meData.localizedFirstName || meData.firstName?.localized?.tr_TR || "";
      const lastName = meData.localizedLastName || meData.lastName?.localized?.tr_TR || "";

      return NextResponse.json({
        ok: true,
        personName: `${firstName} ${lastName}`.trim(),
        orgName,
        message: `Bağlantı başarılı!${orgName ? ` Şirket: ${orgName}` : ""}`,
      });
    } catch (err) {
      return NextResponse.json({ ok: false, message: `Bağlantı hatası: ${String(err)}` }, { status: 500 });
    }
  }

  if (action === "restart") {
    try {
      await execAsync("pm2 restart bio-verim-crm --update-env").catch(() => {});
      return NextResponse.json({ ok: true, message: "Sunucu yeniden başlatıldı." });
    } catch {
      return NextResponse.json({ ok: true, message: "Ayarlar kaydedildi. Sunucuyu manuel olarak yeniden başlatın." });
    }
  }

  return NextResponse.json({ ok: false, message: "Geçersiz işlem." }, { status: 400 });
}
