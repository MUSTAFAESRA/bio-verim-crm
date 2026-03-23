"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProductionOrder(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Generate order number
  const year = new Date().getFullYear();
  const { count } = await supabase.from("production_orders").select("*", { count: "exact", head: true });
  const seq = String((count || 0) + 1).padStart(4, "0");
  const orderNumber = `FAS-${year}-${seq}`;

  const data = {
    order_number: orderNumber,
    supplier_id: formData.get("supplier_id") as string,
    product_id: formData.get("product_id") as string,
    ordered_quantity: Number(formData.get("ordered_quantity")),
    unit_cost: formData.get("unit_cost") ? Number(formData.get("unit_cost")) : null,
    order_date: formData.get("order_date") as string,
    expected_date: (formData.get("expected_date") as string) || null,
    notes: (formData.get("notes") as string) || null,
    status: "planned" as const,
    created_by: user.id,
  };

  const { data: orderInserted, error } = await supabase.from("production_orders").insert(data).select("id").single();
  if (error) throw new Error(error.message);
  const orderId = (orderInserted as unknown as { id: string }).id;

  revalidatePath("/fason-uretim");
  redirect(`/fason-uretim/${orderId}`);
}

export async function addDelivery(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const orderId = formData.get("production_order_id") as string;
  const quantity = Number(formData.get("delivered_quantity"));

  // Insert delivery
  const { error: delivError } = await supabase.from("production_deliveries").insert({
    production_order_id: orderId,
    delivered_quantity: quantity,
    delivery_date: formData.get("delivery_date") as string,
    vehicle_plate: (formData.get("vehicle_plate") as string) || null,
    driver_name: (formData.get("driver_name") as string) || null,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  });
  if (delivError) throw new Error(delivError.message);

  // Get order info
  const { data: order } = await supabase
    .from("production_orders")
    .select("product_id, ordered_quantity, received_quantity, supplier_id, unit_cost, order_number")
    .eq("id", orderId)
    .single();

  if (order) {
    const newReceived = ((order as any).received_quantity || 0) + quantity;
    const newStatus = newReceived >= (order as any).ordered_quantity ? "completed" : "partial_delivery";

    await supabase.from("production_orders").update({
      received_quantity: newReceived,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);

    // Stock-in movement
    await supabase.from("stock_movements").insert({
      product_id: (order as any).product_id,
      movement_type: "in",
      source_type: "production_delivery",
      source_id: orderId,
      quantity,
      created_by: user.id,
    });

    // Auto-create draft purchase invoice if unit_cost is set
    if ((order as any).supplier_id && (order as any).unit_cost) {
      const unitCost = Number((order as any).unit_cost);
      const subtotal = quantity * unitCost;
      const taxRate = 20;
      const taxAmount = subtotal * taxRate / 100;
      const totalAmount = subtotal + taxAmount;

      const year = new Date().getFullYear();
      const { count: invCount } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("invoice_type", "purchase");
      const seq = String((invCount || 0) + 1).padStart(4, "0");
      const invoiceNumber = `ALI-${year}-${seq}`;

      await supabase.from("invoices").insert({
        invoice_number: invoiceNumber,
        invoice_type: "purchase",
        supplier_id: (order as any).supplier_id,
        invoice_date: formData.get("delivery_date") as string,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        paid_amount: 0,
        status: "draft",
        notes: `Otomatik oluşturuldu · Fason teslimat: ${(order as any).order_number ?? ""} · ${quantity} adet`,
        created_by: user.id,
      });
    }
  }

  revalidatePath(`/fason-uretim/${orderId}`);
  revalidatePath("/fason-uretim");
  revalidatePath("/depo");
  revalidatePath("/depo/urunler");
  redirect("/fason-uretim");
}

export async function deleteProductionOrder(id: string) {
  const supabase = await createClient();
  await supabase.from("production_deliveries").delete().eq("production_order_id", id);
  await supabase.from("production_orders").delete().eq("id", id);
  revalidatePath("/fason-uretim");
  redirect("/fason-uretim");
}

export async function createSupplier(formData: FormData) {
  const supabase = await createClient();

  const data = {
    company_name: formData.get("company_name") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    city: (formData.get("city") as string) || null,
    address: (formData.get("address") as string) || null,
    capacity_liters: formData.get("capacity_liters") ? Number(formData.get("capacity_liters")) : null,
    notes: (formData.get("notes") as string) || null,
  };

  const { error } = await supabase.from("suppliers").insert(data);
  if (error) throw new Error(error.message);

  revalidatePath("/fason-uretim/tedarikci");
  redirect("/fason-uretim/tedarikci");
}

export async function deleteSupplier(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;
  if (!id) return;

  await supabase.from("suppliers").delete().eq("id", id);

  revalidatePath("/fason-uretim/tedarikci");
  revalidatePath("/fason-uretim");
  redirect("/fason-uretim/tedarikci");
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createClient();

  const data = {
    company_name: formData.get("company_name") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    city: (formData.get("city") as string) || null,
    address: (formData.get("address") as string) || null,
    capacity_liters: formData.get("capacity_liters") ? Number(formData.get("capacity_liters")) : null,
    notes: (formData.get("notes") as string) || null,
    is_active: formData.get("is_active") !== "false",
  };

  const { error } = await supabase.from("suppliers").update(data).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/fason-uretim/tedarikci");
  revalidatePath(`/fason-uretim/tedarikci/${id}`);
  revalidatePath("/fason-uretim");
  redirect("/fason-uretim/tedarikci");
}
