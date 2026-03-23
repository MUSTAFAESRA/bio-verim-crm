"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function assignSequence(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const customerId = formData.get("customer_id") as string;
  const sequenceId = formData.get("sequence_id") as string;

  // Get sequence details
  const { data: seqRaw } = await supabase
    .from("contact_sequences")
    .select("*")
    .eq("id", sequenceId)
    .single();
  const seq = seqRaw as any;
  if (!seq) throw new Error("Sekans bulunamadı");

  const now = new Date();
  const firstStep = seq.steps?.[0];
  const nextContactAt = new Date(now);
  if (firstStep?.wait_days) nextContactAt.setDate(nextContactAt.getDate() + firstStep.wait_days);

  // Create customer_sequence record
  const { data: cs } = await supabase.from("customer_sequences").insert({
    customer_id: customerId,
    sequence_id: sequenceId,
    started_at: now.toISOString(),
    current_step: 1,
    status: "active",
    next_contact_at: nextContactAt.toISOString(),
    created_by: user.id,
    created_at: now.toISOString(),
  }).select("id").single();

  // Create first reminder
  const { data: custRaw } = await supabase.from("customers").select("company_name").eq("id", customerId).single();
  const custName = (custRaw as any)?.company_name ?? "";

  await supabase.from("reminders").insert({
    customer_id: customerId,
    assigned_to: user.id,
    title: `[${seq.name}] Adım 1: ${firstStep?.message_template ?? "Temas zamanı"}`,
    notes: `Sekans: ${seq.name} · Müşteri: ${custName} · Kanal: ${firstStep?.channel ?? ""}`,
    remind_at: nextContactAt.toISOString(),
    is_completed: false,
    created_by: user.id,
    created_at: now.toISOString(),
  });

  revalidatePath("/iletisim/sekvanslar");
  revalidatePath("/iletisim");
  redirect("/iletisim/sekvanslar");
}

export async function advanceStep(customerSequenceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: csRaw } = await supabase
    .from("customer_sequences")
    .select("*, contact_sequences(*), customers(company_name)")
    .eq("id", customerSequenceId)
    .single();
  const cs = csRaw as any;
  if (!cs) throw new Error("Kayıt bulunamadı");

  const seq = cs.contact_sequences;
  const nextStep = cs.current_step + 1;

  if (nextStep > seq.total_steps) {
    // Sequence completed
    await supabase.from("customer_sequences").update({
      status: "completed",
      current_step: seq.total_steps,
    }).eq("id", customerSequenceId);
  } else {
    const stepData = seq.steps?.[nextStep - 1];
    const nextContactAt = new Date();
    if (stepData?.wait_days) nextContactAt.setDate(nextContactAt.getDate() + stepData.wait_days);

    await supabase.from("customer_sequences").update({
      current_step: nextStep,
      next_contact_at: nextContactAt.toISOString(),
    }).eq("id", customerSequenceId);

    // Create reminder for next step
    await supabase.from("reminders").insert({
      customer_id: cs.customer_id,
      assigned_to: user.id,
      title: `[${seq.name}] Adım ${nextStep}: ${stepData?.message_template ?? "Temas zamanı"}`,
      notes: `Sekans: ${seq.name} · Müşteri: ${cs.customers?.company_name ?? ""} · Kanal: ${stepData?.channel ?? ""}`,
      remind_at: nextContactAt.toISOString(),
      is_completed: false,
      created_by: user.id,
      created_at: new Date().toISOString(),
    });
  }

  revalidatePath("/iletisim/sekvanslar");
  revalidatePath("/iletisim");
}

export async function pauseSequence(id: string) {
  const supabase = await createClient();
  await supabase.from("customer_sequences").update({ status: "paused" }).eq("id", id);
  revalidatePath("/iletisim/sekvanslar");
}

export async function resumeSequence(id: string) {
  const supabase = await createClient();
  await supabase.from("customer_sequences").update({ status: "active" }).eq("id", id);
  revalidatePath("/iletisim/sekvanslar");
}
