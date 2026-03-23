import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, customers(company_name), suppliers(company_name)")
    .order("invoice_date", { ascending: false });

  if (!invoices || invoices.length === 0) {
    return new Response("Veri bulunamadı", { status: 404 });
  }

  const STATUS_MAP: Record<string, string> = {
    draft: "Taslak", sent: "Gönderildi", partially_paid: "Kısmi Ödeme",
    paid: "Ödendi", overdue: "Gecikmiş", cancelled: "İptal",
  };
  const TYPE_MAP: Record<string, string> = { sale: "Satış", purchase: "Alış" };

  const headers = ["Fatura No", "Tür", "Müşteri/Tedarikçi", "Fatura Tarihi", "Vade Tarihi", "Ara Toplam", "KDV", "Toplam", "Ödenen", "Durum"];

  const rows = invoices.map((inv: Record<string, unknown>) => {
    const customer = inv.customers as { company_name: string } | null;
    const supplier = inv.suppliers as { company_name: string } | null;
    return [
      inv.invoice_number || "",
      TYPE_MAP[inv.invoice_type as string] || inv.invoice_type || "",
      customer?.company_name || supplier?.company_name || "",
      inv.invoice_date ? new Date(inv.invoice_date as string).toLocaleDateString("tr-TR") : "",
      inv.due_date ? new Date(inv.due_date as string).toLocaleDateString("tr-TR") : "",
      inv.subtotal || 0,
      inv.tax_amount || 0,
      inv.total_amount || 0,
      inv.paid_amount || 0,
      STATUS_MAP[inv.status as string] || inv.status || "",
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell: unknown) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const bom = "\uFEFF";

  return new Response(bom + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="faturalar_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
