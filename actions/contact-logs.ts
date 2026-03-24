"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createContactLog(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const customerId = formData.get("customer_id") as string;
  const nextActionDate = (formData.get("next_action_date") as string) || null;
  const nextAction = (formData.get("next_action") as string) || null;

  const data = {
    customer_id: customerId,
    contact_type: formData.get("contact_type") as "call" | "visit" | "email" | "whatsapp" | "meeting" | "other",
    direction: (formData.get("direction") as "inbound" | "outbound" | null) || null,
    subject: (formData.get("subject") as string) || null,
    notes: (formData.get("notes") as string) || null,
    contacted_at: (formData.get("contacted_at") as string) || new Date().toISOString(),
    duration_mins: formData.get("duration_mins") ? Number(formData.get("duration_mins")) : null,
    outcome: (formData.get("outcome") as "interested" | "not_interested" | "follow_up" | "sale_made" | "no_answer" | "other" | null) || null,
    next_action: nextAction,
    next_action_date: nextActionDate,
    created_by: user.id,
  };

  const { data: inserted, error } = await supabase.from("contact_logs").insert(data).select("id").single();
  if (error) throw new Error(error.message);
  const logId = (inserted as unknown as { id: string }).id;

  // Create reminder if next_action_date is set
  if (nextActionDate && nextAction) {
    await supabase.from("reminders").insert({
      customer_id: customerId,
      assigned_to: user.id,
      title: nextAction,
      remind_at: new Date(nextActionDate).toISOString(),
      created_by: user.id,
    });
  }

  revalidatePath("/iletisim");
  revalidatePath(`/musteriler/${customerId}`);

  // Arka planda heat score'u güncelle (temas sonrası AI analizi için)
  // Fire-and-forget: await etmiyoruz, redirect bloklamasın
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/ai/customer-heat-score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customerId, customerName: null, forceRefresh: true }),
    }).catch(() => {}); // hata olursa sessizce geç
  } catch { /* kritik değil */ }

  const redirectTo = formData.get("redirect_to") as string;
  if (redirectTo) redirect(redirectTo);
  redirect("/iletisim");
}

export async function createReminder(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = formData.get("title") as string;
  const remindAt = formData.get("remind_at") as string;
  const notes = (formData.get("notes") as string) || null;
  const customerId = (formData.get("customer_id") as string) || null;

  const { error } = await supabase.from("reminders").insert({
    title,
    remind_at: new Date(remindAt).toISOString(),
    notes,
    customer_id: customerId,
    assigned_to: user.id,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/iletisim/hatirlaticilar");
  revalidatePath("/iletisim");
  revalidatePath("/dashboard");
}

export async function markReminderDone(id: string) {
  const supabase = await createClient();
  await supabase.from("reminders").update({
    is_completed: true,
    completed_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath("/iletisim");
  revalidatePath("/dashboard");
}
