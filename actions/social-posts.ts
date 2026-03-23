"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSocialPost(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const platforms = formData.getAll("platform") as string[];

  for (const platform of platforms) {
    await supabase.from("social_posts").insert({
      platform,
      post_type: formData.get("post_type") as string,
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      media_url: (formData.get("media_url") as string) || null,
      scheduled_at: (formData.get("scheduled_at") as string) || null,
      status: formData.get("scheduled_at") ? "scheduled" : "draft",
      created_by: user.id,
      created_at: new Date().toISOString(),
    });
  }

  revalidatePath("/iletisim/sosyal-medya");
  redirect("/iletisim/sosyal-medya");
}

export async function updatePostStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("social_posts").update({
    status,
    published_at: status === "published" ? new Date().toISOString() : null,
  }).eq("id", id);
  revalidatePath("/iletisim/sosyal-medya");
}

export async function deleteSocialPost(id: string) {
  const supabase = await createClient();
  await supabase.from("social_posts").delete().eq("id", id);
  revalidatePath("/iletisim/sosyal-medya");
}
