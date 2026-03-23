"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createLead(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sourceRefId = (formData.get("source_ref_id") as string) || null;

  // Check duplicate by source_ref_id
  if (sourceRefId) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("source_ref_id", sourceRefId)
      .single();

    if (existing) {
      throw new Error("Bu işletme zaten aday listesinde mevcut.");
    }
  }

  const data = {
    business_name: formData.get("business_name") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    city: (formData.get("city") as string) || null,
    address: (formData.get("address") as string) || null,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    source: ((formData.get("source") as string) || "manual") as "google_places" | "linkedin" | "facebook_lead" | "manual" | "other",
    source_ref_id: sourceRefId,
    status: "new" as const,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
    assigned_to: user.id,
  };

  const { error } = await supabase.from("leads").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath("/musteri-adayi");
  redirect("/musteri-adayi");
}

export async function updateLeadStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("leads").update({
    status: status as "new" | "contacted" | "qualified" | "converted" | "rejected",
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath("/musteri-adayi");
  revalidatePath(`/musteri-adayi/${id}`);
}

export async function convertLeadToCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: customerInserted, error } = await supabase.from("customers").insert({
    company_name: formData.get("company_name") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    city: (formData.get("city") as string) || null,
    address: (formData.get("address") as string) || null,
    segment: "lead",
    source: ((formData.get("source") as string) || "manual") as "manual" | "google_places" | "linkedin" | "facebook_lead" | "referral" | "other",
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);
  const customerId = (customerInserted as unknown as { id: string }).id;

  await supabase.from("leads").update({
    status: "converted",
    converted_to: customerId,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath("/musteri-adayi");
  revalidatePath("/musteriler");
  redirect(`/musteriler/${customerId}`);
}
