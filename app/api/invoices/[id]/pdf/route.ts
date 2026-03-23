import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(company_name, contact_name, phone, email, address, city, tax_number, tax_office), suppliers(company_name, contact_name, phone, city)")
      .eq("id", id)
      .single(),
    supabase.from("invoice_items").select("*, products(name, unit)").eq("invoice_id", id),
  ]);

  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı" }, { status: 404 });
  }

  const inv = invoice as Record<string, unknown>;
  const customer = inv.customers as Record<string, string> | null;
  const supplier = inv.suppliers as Record<string, string> | null;
  const party = inv.invoice_type === "sale" ? customer : supplier;
  const partyName = party?.company_name || "—";
  const partyContact = party?.contact_name || "";
  const partyPhone = party?.phone || "";
  const partyAddress = [customer?.address, customer?.city].filter(Boolean).join(", ") || "";
  const partyTax = customer ? `${customer.tax_number || ""} ${customer.tax_office ? "/ " + customer.tax_office : ""}`.trim() : "";

  const formatCurrency = (val: unknown) => {
    const n = Number(val) || 0;
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(n);
  };

  const formatDate = (val: unknown) => {
    if (!val) return "—";
    return new Intl.DateTimeFormat("tr-TR").format(new Date(val as string));
  };

  const itemRows = (items || [])
    .map((item: Record<string, unknown>) => {
      const product = item.products as { name: string; unit: string } | null;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${product?.name || item.description || "—"}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity} ${product?.unit || ""}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(item.unit_price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatCurrency(item.line_total)}</td>
      </tr>`;
    })
    .join("");

  const STATUS_MAP: Record<string, string> = {
    draft: "Taslak", sent: "Gönderildi", partially_paid: "Kısmi Ödeme",
    paid: "Ödendi", overdue: "Gecikmiş", cancelled: "İptal",
  };

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Fatura - ${inv.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; font-size: 13px; }
    .page { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .logo { font-size: 22px; font-weight: 700; color: #16a34a; }
    .logo-sub { font-size: 11px; color: #94a3b8; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { font-size: 28px; color: #1e293b; letter-spacing: -1px; }
    .invoice-title p { color: #64748b; font-size: 13px; margin-top: 4px; }
    .meta-grid { display: flex; justify-content: space-between; margin-bottom: 32px; gap: 24px; }
    .meta-box { flex: 1; }
    .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; margin-bottom: 6px; }
    .meta-value { font-size: 13px; color: #334155; line-height: 1.5; }
    .meta-value strong { color: #1e293b; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #f1f5f9; padding: 10px 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; text-align: left; }
    th:nth-child(2), th:nth-child(3), th:last-child { text-align: right; }
    td { font-size: 13px; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 280px; }
    .totals-table tr td { padding: 6px 8px; }
    .totals-table tr td:last-child { text-align: right; font-weight: 600; }
    .totals-table .grand { border-top: 2px solid #16a34a; font-size: 16px; color: #16a34a; }
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; background: #f1f5f9; color: #64748b; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #94a3b8; }
    @media print { .page { padding: 20px; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="logo">Bio Verim</div>
        <div class="logo-sub">Sıvı Organik Gübre</div>
      </div>
      <div class="invoice-title">
        <h1>FATURA</h1>
        <p>${inv.invoice_number} &middot; <span class="status-badge">${STATUS_MAP[inv.status as string] || inv.status}</span></p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-box">
        <div class="meta-label">${inv.invoice_type === "sale" ? "Müşteri" : "Tedarikçi"}</div>
        <div class="meta-value">
          <strong>${partyName}</strong><br>
          ${partyContact ? partyContact + "<br>" : ""}
          ${partyPhone ? partyPhone + "<br>" : ""}
          ${partyAddress ? partyAddress + "<br>" : ""}
          ${partyTax ? "<small>" + partyTax + "</small>" : ""}
        </div>
      </div>
      <div class="meta-box">
        <div class="meta-label">Fatura Bilgileri</div>
        <div class="meta-value">
          Fatura Tarihi: <strong>${formatDate(inv.invoice_date)}</strong><br>
          Vade Tarihi: <strong>${formatDate(inv.due_date)}</strong><br>
          KDV Oranı: <strong>%${inv.tax_rate || 20}</strong>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Ürün / Açıklama</th>
          <th style="text-align:center;">Miktar</th>
          <th>Birim Fiyat</th>
          <th>Toplam</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#94a3b8;">Kalem bulunamadı</td></tr>'}
      </tbody>
    </table>

    <div class="totals">
      <table class="totals-table">
        <tr><td>Ara Toplam</td><td>${formatCurrency(inv.subtotal)}</td></tr>
        <tr><td>KDV (%${inv.tax_rate || 20})</td><td>${formatCurrency(inv.tax_amount)}</td></tr>
        <tr class="grand"><td><strong>Genel Toplam</strong></td><td><strong>${formatCurrency(inv.total_amount)}</strong></td></tr>
        <tr><td>Ödenen</td><td>${formatCurrency(inv.paid_amount)}</td></tr>
        <tr><td><strong>Kalan</strong></td><td><strong>${formatCurrency((Number(inv.total_amount) || 0) - (Number(inv.paid_amount) || 0))}</strong></td></tr>
      </table>
    </div>

    <div class="footer">
      Bu belge Bio Verim CRM sistemi tarafından oluşturulmuştur. &middot; ${formatDate(new Date().toISOString())}
    </div>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${inv.invoice_number}.html"`,
    },
  });
}
