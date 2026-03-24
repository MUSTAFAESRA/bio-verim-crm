"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInfluencerContact(formData: FormData) {
  const supabase = await createClient();

  const data = {
    full_name: formData.get("full_name") as string,
    title: (formData.get("title") as string) || null,
    platform: formData.get("platform") as "linkedin" | "instagram" | "facebook" | "youtube" | "other",
    profile_url: (formData.get("profile_url") as string) || null,
    followers_count: formData.get("followers_count") ? Number(formData.get("followers_count")) : null,
    city: (formData.get("city") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: "not_contacted" as const,
  };

  const { error } = await supabase.from("influencer_contacts").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath("/musteri-adayi/kol-takip");
}

export async function updateInfluencerStatus(
  id: string,
  status: "not_contacted" | "dm_sent" | "responded" | "meeting_set" | "converted"
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("influencer_contacts")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/musteri-adayi/kol-takip");
}

export async function deleteInfluencerContact(id: string) {
  const supabase = await createClient();
  await supabase.from("influencer_contacts").delete().eq("id", id);
  revalidatePath("/musteri-adayi/kol-takip");
}
