import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("company_name", { ascending: true });

  if (!customers || customers.length === 0) {
    return new Response("Veri bulunamadı", { status: 404 });
  }

  const SEGMENT_MAP: Record<string, string> = { lead: "Aday", active: "Aktif", passive: "Pasif" };

  const headers = ["Firma Adı", "Yetkili", "Telefon", "E-posta", "Şehir", "İlçe", "Vergi No", "Vergi Dairesi", "Segment", "Kaynak", "Eklenme Tarihi"];

  const rows = customers.map((c: Record<string, unknown>) => [
    c.company_name || "",
    c.contact_name || "",
    c.phone || "",
    c.email || "",
    c.city || "",
    c.district || "",
    c.tax_number || "",
    c.tax_office || "",
    SEGMENT_MAP[c.segment as string] || c.segment || "",
    c.source || "",
    c.created_at ? new Date(c.created_at as string).toLocaleDateString("tr-TR") : "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell: unknown) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  // BOM for Excel UTF-8 compatibility
  const bom = "\uFEFF";

  return new Response(bom + csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="musteriler_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
