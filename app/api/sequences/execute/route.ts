import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendWhatsAppMessage, isWhatsAppConfigured } from "@/lib/whatsapp";
import { sendMessengerMessage, isMessengerConfigured } from "@/lib/facebook-messenger";
import { sendInstagramDM, isInstagramConfigured } from "@/lib/instagram-dm";

export const maxDuration = 60;

// ── Cron Job: Zamanı gelmiş sekans adımlarını yürüt ──────────────────────────
// vercel.json: { "path": "/api/sequences/execute", "schedule": "0 8 * * *" }
// Yerel test için: GET http://localhost:3000/api/sequences/execute

// Gemini ile mesajı kişiselleştir (email için konu+gövde, diğerleri için sadece gövde)
async function personalizeWithGemini(
  template: string,
  customerName: string,
  channel: string,
  seqName: string
): Promise<{ subject: string; body: string }> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey || geminiKey.startsWith("your_")) {
    const body = template
      .replace(/\{\{musteri_adi\}\}/g, customerName)
      .replace(/\{\{urun_adi\}\}/g, "Bio Verim Sıvı Gübre")
      .replace(/\{\{tarih\}\}/g, new Date().toLocaleDateString("tr-TR"))
      .replace(/\{\{fiyat\}\}/g, "İletişime geçin");
    return { subject: `${seqName} — Bioverim`, body };
  }

  const channelInstructions: Record<string, string> = {
    email: "Profesyonel e-posta formatı. İlk satır [KONU]: ile başlasın. Sonra e-posta gövdesi. Maksimum 150 kelime.",
    whatsapp: "Kısa ve samimi WhatsApp mesajı. Maksimum 80 kelime.",
    facebook_dm: "Samimi Facebook Messenger mesajı. Maksimum 80 kelime.",
    instagram: "Instagram DM tonu, emoji ekleyebilirsin. Maksimum 80 kelime.",
  };

  const prompt = `Bioverim Gübre satış temsilcisi olarak aşağıdaki mesaj şablonunu ${customerName} için kişiselleştir.

ŞABLON:
${template}

MÜŞTERİ: ${customerName}
SEKANS: ${seqName}
KANAL: ${channel}

TALİMAT: ${channelInstructions[channel] ?? "Kısa ve samimi. Maksimum 80 kelime."}

{{musteri_adi}} yerine ${customerName} yaz.
{{urun_adi}} yerine "Bio Verim Sıvı Gübre" yaz.
{{tarih}} yerine "${new Date().toLocaleDateString("tr-TR")}" yaz.
{{fiyat}} yerine "detay için irtibata geçin" yaz.

Sadece kişiselleştirilmiş mesajı yaz, başka açıklama ekleme.`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.6,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (!res.ok) throw new Error("Gemini: " + res.status);
    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (channel === "email" && text.includes("[KONU]:")) {
      const lines = text.split("\n");
      const subjectLine = lines.find((l: string) => l.startsWith("[KONU]:")) ?? "";
      const subject = subjectLine.replace("[KONU]:", "").trim() || `${seqName} — Bioverim`;
      const body = lines.filter((l: string) => !l.startsWith("[KONU]:")).join("\n").trim();
      return { subject, body };
    }

    return { subject: `${seqName} — Bioverim`, body: text || template };
  } catch {
    const fallback = template
      .replace(/\{\{musteri_adi\}\}/g, customerName)
      .replace(/\{\{urun_adi\}\}/g, "Bio Verim Sıvı Gübre")
      .replace(/\{\{tarih\}\}/g, new Date().toLocaleDateString("tr-TR"))
      .replace(/\{\{fiyat\}\}/g, "İletişime geçin");
    return { subject: `${seqName} — Bioverim`, body: fallback };
  }
}

export async function GET(req: NextRequest) {
  // Cron güvenliği — Vercel otomatik CRON_SECRET ekler
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || supabaseUrl.includes("placeholder") || !serviceKey || serviceKey.includes("placeholder")) {
    return NextResponse.json({
      message: "Demo modu — Supabase yapılandırılmamış",
      executed: 0,
    });
  }

  const supabase = createServerClient(supabaseUrl, serviceKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const now = new Date();

  // Zamanı gelmiş aktif sekans adımlarını çek
  const { data: dueSequences, error } = await supabase
    .from("customer_sequences")
    .select(`
      id, customer_id, current_step, status, next_contact_at,
      contact_sequences(id, name, steps, total_steps),
      customers(id, company_name, contact_name, phone, email, facebook_psid, instagram_psid)
    `)
    .eq("status", "active")
    .lte("next_contact_at", now.toISOString())
    .limit(50);

  if (error) {
    console.error("Sekans sorgulama hatası:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dueSequences || dueSequences.length === 0) {
    return NextResponse.json({ message: "Zamanı gelmiş sekans adımı yok", executed: 0 });
  }

  const results = {
    executed: 0,
    whatsappSent: 0,
    emailSent: 0,
    messengerSent: 0,
    instagramSent: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const cs of dueSequences) {
    const seq = (cs as Record<string, unknown>).contact_sequences as {
      id: string;
      name: string;
      steps: Array<{ step_no: number; channel: string; message_template: string; wait_days: number }>;
      total_steps: number;
    } | null;

    const customer = (cs as Record<string, unknown>).customers as {
      id: string;
      company_name: string;
      contact_name: string | null;
      phone: string | null;
      email: string | null;
      facebook_psid: string | null;
      instagram_psid: string | null;
    } | null;

    if (!seq || !customer) continue;

    const currentStep = (cs as Record<string, unknown>).current_step as number;
    const stepData = seq.steps?.find((s) => s.step_no === currentStep);
    if (!stepData) continue;

    const customerName = customer.company_name || customer.contact_name || "Müşteri";
    const csId = (cs as Record<string, unknown>).id as string;

    let contactType = "other";
    let sentOk = false;
    let sendError: string | undefined;

    // ── Kanal bazlı gönderim ──────────────────────────────────────────────────
    if (stepData.channel === "whatsapp") {
      contactType = "whatsapp";
      if (!customer.phone) {
        results.errors.push(`${customerName}: Telefon numarası yok`);
        continue;
      }
      const { subject: _s, body: messageText } = await personalizeWithGemini(
        stepData.message_template, customerName, "whatsapp", seq.name
      );
      if (isWhatsAppConfigured()) {
        const r = await sendWhatsAppMessage(customer.phone, messageText);
        sentOk = r.success;
        if (r.success) results.whatsappSent++;
        else { results.errors.push(`${customerName} (WA): ${r.error}`); }
      }
      // WhatsApp log
      await supabase.from("contact_logs").insert({
        customer_id: customer.id,
        contact_type: "whatsapp",
        direction: "outbound",
        subject: `[Oto Sekans] ${seq.name} — Adım ${currentStep}`,
        notes: messageText,
        contacted_at: now.toISOString(),
        outcome: "follow_up",
        created_at: now.toISOString(),
      });
      sentOk = true;

    } else if (stepData.channel === "email") {
      contactType = "email";
      if (!customer.email) {
        results.skipped++;
        results.errors.push(`${customerName}: E-posta adresi yok`);
        continue;
      }
      const resendKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL ?? "Bioverim <noreply@bioverim.com>";
      const isDemoEmail = !resendKey || resendKey.startsWith("your_") || resendKey.startsWith("re_placeholder");

      const { subject, body: emailBody } = await personalizeWithGemini(
        stepData.message_template, customerName, "email", seq.name
      );

      if (!isDemoEmail) {
        try {
          const emailRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [customer.email],
              subject,
              text: emailBody,
            }),
          });
          sentOk = emailRes.ok;
          if (sentOk) results.emailSent++;
          else {
            const errData = await emailRes.json().catch(() => ({}));
            results.errors.push(`${customerName} (Email): ${JSON.stringify(errData)}`);
          }
        } catch (e) {
          results.errors.push(`${customerName} (Email): ${(e as Error).message}`);
        }
      } else {
        // Demo modu — gerçek email gönderilmez
        sentOk = true;
        results.emailSent++;
        console.log(`[Demo] Email simüle edildi → ${customer.email}: ${subject}`);
      }

      await supabase.from("contact_logs").insert({
        customer_id: customer.id,
        contact_type: "email",
        direction: "outbound",
        subject: `[Oto Sekans] ${seq.name} — Adım ${currentStep}: ${subject}`,
        notes: emailBody,
        contacted_at: now.toISOString(),
        outcome: "follow_up",
        created_at: now.toISOString(),
      });
      sentOk = true;

    } else if (stepData.channel === "facebook_dm") {
      contactType = "other";
      if (!customer.facebook_psid) {
        results.skipped++;
        results.errors.push(`${customerName}: Facebook PSID yok — müşteri önce sayfaya mesaj atmalı`);
        continue;
      }
      const { subject: _s, body: messageText } = await personalizeWithGemini(
        stepData.message_template, customerName, "facebook_dm", seq.name
      );
      if (isMessengerConfigured()) {
        const r = await sendMessengerMessage(customer.facebook_psid, messageText);
        sentOk = r.success;
        sendError = r.error;
        if (r.success) results.messengerSent++;
        else results.errors.push(`${customerName} (FB): ${r.error}`);
      } else {
        // Demo / yapılandırılmamış — logla
        sentOk = true;
        results.messengerSent++;
        console.log(`[Demo] Facebook Messenger simüle edildi → ${customerName}`);
      }
      await supabase.from("contact_logs").insert({
        customer_id: customer.id,
        contact_type: "other",
        direction: "outbound",
        subject: `[Oto Sekans] ${seq.name} — Adım ${currentStep} (Facebook)`,
        notes: messageText,
        contacted_at: now.toISOString(),
        outcome: "follow_up",
        created_at: now.toISOString(),
      });
      sentOk = true;

    } else if (stepData.channel === "instagram") {
      contactType = "other";
      if (!customer.instagram_psid) {
        results.skipped++;
        results.errors.push(`${customerName}: Instagram PSID yok — müşteri önce DM atmalı`);
        continue;
      }
      const { subject: _s, body: messageText } = await personalizeWithGemini(
        stepData.message_template, customerName, "instagram", seq.name
      );
      if (isInstagramConfigured()) {
        const r = await sendInstagramDM(customer.instagram_psid, messageText);
        sentOk = r.success;
        sendError = r.error;
        if (r.success) results.instagramSent++;
        else results.errors.push(`${customerName} (IG): ${r.error}`);
      } else {
        sentOk = true;
        results.instagramSent++;
        console.log(`[Demo] Instagram DM simüle edildi → ${customerName}`);
      }
      await supabase.from("contact_logs").insert({
        customer_id: customer.id,
        contact_type: "other",
        direction: "outbound",
        subject: `[Oto Sekans] ${seq.name} — Adım ${currentStep} (Instagram)`,
        notes: messageText,
        contacted_at: now.toISOString(),
        outcome: "follow_up",
        created_at: now.toISOString(),
      });
      sentOk = true;

    } else {
      // Arama, LinkedIn veya bilinmeyen kanal — manuel
      results.skipped++;
      continue;
    }

    // Bir sonraki adıma geç
    const nextStep = currentStep + 1;
    if (nextStep > seq.total_steps) {
      await supabase
        .from("customer_sequences")
        .update({ status: "completed", current_step: seq.total_steps })
        .eq("id", csId);
    } else {
      const nextStepData = seq.steps?.find((s) => s.step_no === nextStep);
      const nextContactAt = new Date(now);
      if (nextStepData?.wait_days) {
        nextContactAt.setDate(nextContactAt.getDate() + nextStepData.wait_days);
      }
      await supabase
        .from("customer_sequences")
        .update({ current_step: nextStep, next_contact_at: nextContactAt.toISOString() })
        .eq("id", csId);
    }

    results.executed++;
    void (contactType); // suppress unused warning
    void (sendError);
  }

  console.log("Sekans yürütme sonuçları:", results);
  return NextResponse.json(results);
}
