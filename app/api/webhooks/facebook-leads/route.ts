import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

// Facebook Lead Ads webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.FACEBOOK_APP_SECRET || "bio_verim_webhook_token";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Doğrulama başarısız" }, { status: 403 });
}

// Receive lead data from Facebook Lead Ads
export async function POST(request: NextRequest) {
  const body = await request.text();

  // Verify signature
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (appSecret) {
    const signature = request.headers.get("x-hub-signature-256");
    if (signature) {
      const expectedSig = `sha256=${crypto.createHmac("sha256", appSecret).update(body).digest("hex")}`;
      if (signature !== expectedSig) {
        return NextResponse.json({ error: "Geçersiz imza" }, { status: 403 });
      }
    }
  }

  const data = JSON.parse(body);
  const supabase = await createClient();

  // Process lead entries
  for (const entry of data.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === "leadgen") {
        const leadId = change.value.leadgen_id;

        // Fetch lead details from Facebook Graph API (if access token configured)
        const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        let leadData: {
          name?: string;
          phone?: string;
          email?: string;
          city?: string;
        } = {};

        if (accessToken) {
          try {
            const res = await fetch(
              `https://graph.facebook.com/v18.0/${leadId}?fields=field_data&access_token=${accessToken}`
            );
            const fbLead = await res.json();
            const fields: Record<string, string> = {};
            for (const field of fbLead.field_data || []) {
              fields[field.name] = field.values?.[0] || "";
            }
            leadData = {
              name: fields.full_name || fields.name || "",
              phone: fields.phone_number || fields.phone || "",
              email: fields.email || "",
              city: fields.city || "",
            };
          } catch {
            // ignore
          }
        }

        await supabase.from("leads").insert({
          business_name: leadData.name || `Facebook Lead #${leadId}`,
          phone: leadData.phone || null,
          email: leadData.email || null,
          city: leadData.city || null,
          source: "facebook_lead",
          source_ref_id: leadId,
          status: "new",
        });
      }
    }
  }

  return NextResponse.json({ success: true });
}
