"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createQuote(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const customerId = formData.get("customer_id") as string;
  const taxRate = Number(formData.get("tax_rate") ?? 20);
  const subtotal = Number(formData.get("subtotal") ?? 0);
  const itemsJson = formData.get("items_json") as string;

  // Generate quote number
  const now = new Date();
  const year = now.getFullYear();
  const { data: lastRaw } = await supabase
    .from("quotes")
    .select("quote_number")
    .order("created_at", { ascending: false })
    .limit(1);
  const last = lastRaw?.[0] as any;
  let seq = 1;
  if (last?.quote_number) {
    const match = last.quote_number.match(/(\d+)$/);
    if (match) seq = parseInt(match[1]) + 1;
  }
  const quoteNumber = `TKL-${year}-${String(seq).padStart(3, "0")}`;

  const { data: quote, error: quoteError } = await supabase.from("quotes").insert({
    customer_id: customerId,
    quote_number: quoteNumber,
    status: "draft",
    valid_until: (formData.get("valid_until") as string) || null,
    notes: (formData.get("notes") as string) || null,
    subtotal,
    tax_rate: taxRate,
    created_by: user.id,
    created_at: now.toISOString(),
  }).select("id").single();

  if (quoteError || !quote) {
    redirect(`/musteriler/${customerId}`);
  }

  if (quote && itemsJson) {
    const items = JSON.parse(itemsJson) as Array<{
      product_id: string | null;
      description: string;
      quantity: number;
      unit_price: number;
      discount_percent: number;
    }>;
    const toInsert = items
      .filter(i => i.description || i.quantity > 0)
      .map(i => {
        const lineTotal = i.quantity * i.unit_price * (1 - i.discount_percent / 100);
        return {
          quote_id: (quote as any).id,
          product_id: i.product_id || null,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount_percent: i.discount_percent,
          line_total: lineTotal,
        };
      });
    if (toInsert.length > 0) {
      await supabase.from("quote_items").insert(toInsert as any);
    }
  }

  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}/teklif/${(quote as any)?.id}`);
}

export async function updateQuoteStatus(id: string, status: string, customerId: string) {
  const supabase = await createClient();
  await supabase.from("quotes").update({ status }).eq("id", id);
  revalidatePath(`/musteriler/${customerId}`);
  revalidatePath(`/musteriler/${customerId}/teklif/${id}`);
}

export async function deleteQuote(id: string, customerId: string) {
  const supabase = await createClient();
  await supabase.from("quote_items").delete().eq("quote_id", id);
  await supabase.from("quotes").delete().eq("id", id);
  revalidatePath(`/musteriler/${customerId}`);
  redirect(`/musteriler/${customerId}`);
}
