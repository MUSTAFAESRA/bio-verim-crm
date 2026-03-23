import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Vercel Cron Job — runs daily at 08:00 UTC
// vercel.json: { "crons": [{ "path": "/api/reminders/send-daily", "schedule": "0 8 * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically for cron jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !serviceKey || supabaseUrl.includes("placeholder")) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Use service role key — no cookies needed for cron
  const supabase = createServerClient(supabaseUrl, serviceKey, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
  });

  // Get today's reminders (not completed, due today or overdue)
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: reminders } = await supabase
    .from("reminders")
    .select("*, customers(company_name), profiles!reminders_assigned_to_fkey(full_name, id)")
    .eq("is_completed", false)
    .lte("remind_at", todayEnd.toISOString())
    .order("remind_at", { ascending: true });

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ message: "No reminders for today", sent: 0 });
  }

  // Get assigned users' emails
  const userIds = [...new Set(reminders.map((r: Record<string, unknown>) => r.assigned_to).filter(Boolean))];

  if (userIds.length === 0) {
    return NextResponse.json({ message: "No users to notify", sent: 0 });
  }

  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const userEmailMap = new Map<string, string>();
  authUsers?.users?.forEach((u: { id: string; email?: string }) => {
    if (u.email) userEmailMap.set(u.id, u.email);
  });

  // Group reminders by user
  const remindersByUser = new Map<string, typeof reminders>();
  for (const r of reminders) {
    const userId = r.assigned_to as string;
    if (!userId || !userEmailMap.has(userId)) continue;
    const existing = remindersByUser.get(userId) || [];
    existing.push(r);
    remindersByUser.set(userId, existing);
  }

  if (!resendKey) {
    return NextResponse.json({
      message: "Resend API key not configured. Would send to " + remindersByUser.size + " users.",
      sent: 0,
    });
  }

  let sentCount = 0;
  const errors: string[] = [];

  for (const [userId, userReminders] of remindersByUser) {
    const email = userEmailMap.get(userId);
    if (!email) continue;

    const profile = (userReminders[0] as Record<string, unknown>).profiles as { full_name: string } | null;
    const userName = profile?.full_name || "Kullanıcı";

    const reminderList = userReminders
      .map((r: Record<string, unknown>) => {
        const customer = (r.customers as { company_name: string } | null)?.company_name || "";
        const isOverdue = new Date(r.remind_at as string) < new Date();
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${isOverdue ? "🔴" : "🟡"} ${r.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${customer}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${new Date(r.remind_at as string).toLocaleDateString("tr-TR")}</td>
        </tr>`;
      })
      .join("");

    const overdueCount = userReminders.filter((r: Record<string, unknown>) => new Date(r.remind_at as string) < new Date()).length;

    const htmlBody = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#16a34a;color:white;padding:20px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:20px;">Bio Verim CRM — Günlük Hatırlatıcılar</h1>
        </div>
        <div style="padding:20px;background:white;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
          <p>Merhaba <strong>${userName}</strong>,</p>
          <p>Bugün için <strong>${userReminders.length}</strong> hatırlatıcınız var${overdueCount > 0 ? ` (${overdueCount} gecikmiş)` : ""}:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">Hatırlatıcı</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">Müşteri</th>
                <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;">Tarih</th>
              </tr>
            </thead>
            <tbody>${reminderList}</tbody>
          </table>
          <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Bu e-posta Bio Verim CRM sistemi tarafından otomatik gönderilmiştir.</p>
        </div>
      </div>`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: "Bio Verim CRM <noreply@biyoverim.com>",
          to: [email],
          subject: `[Bio Verim] ${userReminders.length} hatırlatıcınız var${overdueCount > 0 ? ` (${overdueCount} gecikmiş!)` : ""}`,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        sentCount++;
      } else {
        const err = await res.text();
        errors.push(`${email}: ${err}`);
      }
    } catch (e) {
      errors.push(`${email}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    message: `Sent ${sentCount} reminder emails`,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
  });
}
