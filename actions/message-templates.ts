"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTemplate(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("message_templates").insert({
    title: formData.get("title") as string,
    channel: formData.get("channel") as string,
    category: formData.get("category") as string,
    content: formData.get("content") as string,
    created_at: new Date().toISOString(),
  });

  revalidatePath("/iletisim/sablonlar");
  redirect("/iletisim/sablonlar");
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient();
  await supabase.from("message_templates").delete().eq("id", id);
  revalidatePath("/iletisim/sablonlar");
}
