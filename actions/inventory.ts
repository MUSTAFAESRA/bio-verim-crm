"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProduct(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = {
    sku: formData.get("sku") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    unit: (formData.get("unit") as string) || "litre",
    category: (formData.get("category") as string) || null,
    min_stock_level: Number(formData.get("min_stock_level") || 0),
    unit_cost: formData.get("unit_cost") ? Number(formData.get("unit_cost")) : null,
    unit_price: formData.get("unit_price") ? Number(formData.get("unit_price")) : null,
    is_active: true,
  };

  const { error } = await supabase.from("products").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath("/depo");
  redirect("/depo/urunler");
}

export async function updateProduct(id: string, formData: FormData) {
  const supabase = await createClient();

  const data = {
    sku: formData.get("sku") as string,
    name: formData.get("name") as string,
    description: (formData.get("description") as string) || null,
    unit: (formData.get("unit") as string) || "litre",
    category: (formData.get("category") as string) || null,
    min_stock_level: Number(formData.get("min_stock_level") || 0),
    unit_cost: formData.get("unit_cost") ? Number(formData.get("unit_cost")) : null,
    unit_price: formData.get("unit_price") ? Number(formData.get("unit_price")) : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("products").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/depo");
  revalidatePath(`/depo/urunler/${id}`);
  redirect(`/depo/urunler/${id}`);
}

export async function addStockMovement(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const data = {
    product_id: formData.get("product_id") as string,
    movement_type: formData.get("movement_type") as "in" | "out" | "adjustment",
    source_type: ((formData.get("source_type") as string) || "manual") as "production_delivery" | "sale" | "return" | "manual" | "adjustment",
    quantity: Number(formData.get("quantity")),
    unit_cost: formData.get("unit_cost") ? Number(formData.get("unit_cost")) : null,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  };

  const { error } = await supabase.from("stock_movements").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath("/depo");
  redirect("/depo/hareketler");
}
