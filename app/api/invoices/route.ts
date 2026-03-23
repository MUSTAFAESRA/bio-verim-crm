import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const formData = await request.formData();
  const invoiceType = formData.get("invoice_type") as "purchase" | "sale";
  const subtotal = Number(formData.get("subtotal") || 0);
  const taxRate = Number(formData.get("tax_rate") || 20);

  const prefix = invoiceType === "sale" ? "SAT" : "ALI";
  const year = new Date().getFullYear();
  const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("invoice_type", invoiceType);
  const seq = String((count || 0) + 1).padStart(4, "0");
  const invoiceNumber = `${prefix}-${year}-${seq}`;

  const { data: invoice, error } = await supabase.from("invoices").insert({
    invoice_number: invoiceNumber,
    invoice_type: invoiceType,
    customer_id: invoiceType === "sale" ? (formData.get("customer_id") as string) || null : null,
    supplier_id: invoiceType === "purchase" ? (formData.get("supplier_id") as string) || null : null,
    invoice_date: formData.get("invoice_date") as string,
    due_date: (formData.get("due_date") as string) || null,
    subtotal,
    tax_rate: taxRate,
    paid_amount: 0,
    status: "draft",
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const invoiceId = (invoice as unknown as { id: string }).id;

  const itemsJson = formData.get("items_json") as string;
  if (itemsJson) {
    const items = JSON.parse(itemsJson);
    if (items.length > 0) {
      await supabase.from("invoice_items").insert(
        items.map((item: { description: string; quantity: number; unit_price: number; product_id?: string }) => ({
          invoice_id: invoiceId,
          product_id: item.product_id || null,
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        }))
      );
    }
  }

  return NextResponse.json({ id: invoiceId });
}
