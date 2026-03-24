"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createInvoice(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const invoiceType = formData.get("invoice_type") as "purchase" | "sale";
  const subtotal = Number(formData.get("subtotal") || 0);
  const taxRate = Number(formData.get("tax_rate") || 20);

  // Generate invoice number
  const prefix = invoiceType === "sale" ? "SAT" : "ALI";
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("invoice_type", invoiceType);
  const seq = String((count || 0) + 1).padStart(4, "0");
  const invoiceNumber = `${prefix}-${year}-${seq}`;

  const invoiceData = {
    invoice_number: invoiceNumber,
    invoice_type: invoiceType,
    customer_id: invoiceType === "sale" ? (formData.get("customer_id") as string) || null : null,
    supplier_id: invoiceType === "purchase" ? (formData.get("supplier_id") as string) || null : null,
    invoice_date: formData.get("invoice_date") as string,
    due_date: (formData.get("due_date") as string) || null,
    subtotal,
    tax_rate: taxRate,
    paid_amount: 0,
    status: "draft" as const,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  };

  const { data: invoiceInserted, error } = await supabase.from("invoices").insert(invoiceData).select("id").single();
  if (error) throw new Error(error.message);
  const invoiceId = (invoiceInserted as unknown as { id: string }).id;

  // Insert line items
  const itemsJson = formData.get("items_json") as string;
  if (itemsJson) {
    const items = JSON.parse(itemsJson) as Array<{
      product_id?: string;
      description: string;
      quantity: number;
      unit_price: number;
    }>;

    if (items.length > 0) {
      const lineItems = items.map((item) => ({
        invoice_id: invoiceId,
        product_id: item.product_id || null,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price,
      }));

      await supabase.from("invoice_items").insert(lineItems);

      // Auto stock-out for sale invoices
      if (invoiceType === "sale") {
        for (const item of items) {
          if (item.product_id) {
            await supabase.from("stock_movements").insert({
              product_id: item.product_id,
              movement_type: "out",
              source_type: "sale",
              source_id: invoiceId,
              quantity: item.quantity,
              created_by: user.id,
            });
          }
        }
      }
    }
  }

  // Generate payment plan if installments
  const installments = Number(formData.get("installments") || 0);
  const firstPaymentDate = formData.get("first_payment_date") as string;
  if (installments > 1 && firstPaymentDate) {
    const total = subtotal + subtotal * (taxRate / 100);
    const installmentAmount = Number((total / installments).toFixed(2));

    const plans = Array.from({ length: installments }, (_, i) => {
      const d = new Date(firstPaymentDate);
      d.setMonth(d.getMonth() + i);
      return {
        invoice_id: invoiceId,
        installment_no: i + 1,
        due_date: d.toISOString().split("T")[0],
        amount: i === installments - 1 ? Number((total - installmentAmount * (installments - 1)).toFixed(2)) : installmentAmount,
        is_paid: false,
      };
    });

    await supabase.from("payment_plans").insert(plans);
  }

  revalidatePath("/finans");
  redirect(`/finans/faturalar/${invoiceId}`);
}

export async function addPayment(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const invoiceId = formData.get("invoice_id") as string;
  const amount = Number(formData.get("amount"));

  const paymentData = {
    invoice_id: invoiceId,
    payment_date: formData.get("payment_date") as string,
    amount,
    payment_method: (formData.get("payment_method") as "bank_transfer" | "cash" | "check" | "credit_card" | null) || null,
    reference_no: (formData.get("reference_no") as string) || null,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
  };

  const { error: payError } = await supabase.from("bv_payments").insert(paymentData);
  if (payError) throw new Error(payError.message);

  // Update invoice paid_amount and status
  const { data: invoiceData } = await supabase
    .from("invoices")
    .select("paid_amount, total_amount")
    .eq("id", invoiceId)
    .single();
  const invoice = invoiceData as { paid_amount: number | null; total_amount: number } | null;

  if (invoice) {
    const newPaid = (invoice.paid_amount || 0) + amount;
    const newStatus = newPaid >= invoice.total_amount ? "paid" :
                      newPaid > 0 ? "partially_paid" : "sent";

    await supabase.from("invoices").update({
      paid_amount: newPaid,
      status: newStatus,
      updated_at: new Date().toISOString(),
    }).eq("id", invoiceId);
  }

  revalidatePath(`/finans/faturalar/${invoiceId}`);
  revalidatePath("/finans");
  redirect(`/finans/faturalar/${invoiceId}`);
}

export async function confirmInvoice(id: string) {
  const supabase = await createClient();
  await supabase.from("invoices").update({
    status: "sent",
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/finans/faturalar/${id}`);
  revalidatePath("/finans");
  revalidatePath("/finans/tedarikci-cari");
  revalidatePath("/finans/tedarikci-cari/[id]", "page");
}

export async function updateInvoiceStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("invoices").update({
    status: status as "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled",
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  revalidatePath(`/finans/faturalar/${id}`);
  revalidatePath("/finans");
}
