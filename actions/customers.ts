"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = {
    company_name: formData.get("company_name") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    city: (formData.get("city") as string) || null,
    district: (formData.get("district") as string) || null,
    address: (formData.get("address") as string) || null,
    tax_number: (formData.get("tax_number") as string) || null,
    tax_office: (formData.get("tax_office") as string) || null,
    segment: (formData.get("segment") as "lead" | "active" | "passive") || "lead",
    source: ((formData.get("source") as string) || "manual") as "manual" | "google_places" | "linkedin" | "facebook_lead" | "referral" | "other",
    notes: (formData.get("notes") as string) || null,
    linkedin_url: (formData.get("linkedin_url") as string) || null,
    instagram_url: (formData.get("instagram_url") as string) || null,
    facebook_url: (formData.get("facebook_url") as string) || null,
    created_by: user.id,
  };

  const { data: inserted, error } = await supabase.from("customers").insert(data).select("id").single();

  if (error) throw new Error(error.message);

  const customerId = (inserted as unknown as { id: string }).id;
  revalidatePath("/musteriler");
  redirect(`/musteriler/${customerId}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = {
    company_name: formData.get("company_name") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    city: (formData.get("city") as string) || null,
    district: (formData.get("district") as string) || null,
    address: (formData.get("address") as string) || null,
    tax_number: (formData.get("tax_number") as string) || null,
    tax_office: (formData.get("tax_office") as string) || null,
    segment: (formData.get("segment") as "lead" | "active" | "passive"),
    notes: (formData.get("notes") as string) || null,
    linkedin_url: (formData.get("linkedin_url") as string) || null,
    instagram_url: (formData.get("instagram_url") as string) || null,
    facebook_url: (formData.get("facebook_url") as string) || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("customers").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath(`/musteriler/${id}`);
  revalidatePath("/musteriler");
  redirect(`/musteriler/${id}`);
}

export async function updateCustomerSegment(id: string, segment: "lead" | "active" | "passive") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ segment, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/musteriler/${id}`);
  revalidatePath("/musteriler");
}

export async function bulkUpdateSegment(ids: string[], segment: "lead" | "active" | "passive") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ segment, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw new Error(error.message);
  revalidatePath("/musteriler");
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/musteriler");
  redirect("/musteriler");
}
