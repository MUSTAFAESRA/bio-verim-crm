import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Pencil,
  MessageSquare,
  Receipt,
  Plus,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  SEGMENT_LABELS,
  CONTACT_TYPE_LABELS,
  OUTCOME_LABELS,
  INVOICE_STATUS_LABELS,
  SOURCE_LABELS,
  QUOTE_STATUS_LABELS,
} from "@/lib/utils";
import { ContactHistory } from "@/components/musteriler/contact-history";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { Customer, ContactLog, Invoice, CustomerBalance } from "@/lib/db-types";

const SEGMENT_VARIANTS: Record<string, "warning" | "success" | "muted"> = {
  lead: "warning",
  active: "success",
  passive: "muted",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MusteriDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customerRaw }, { data: contactsRaw }, { data: invoicesRaw }, { data: balanceRaw }, { data: paymentsRaw }, { data: quotesRaw }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase
        .from("contact_logs")
        .select("*")
        .eq("customer_id", id)
        .order("contacted_at", { ascending: false })
        .limit(10),
      supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", id)
        .eq("invoice_type", "sale")
        .order("invoice_date", { ascending: false })
        .limit(20),
      supabase.from("customer_balance").select("*").eq("id", id).single(),
      supabase
        .from("bv_payments")
        .select("*, invoices(invoice_number, customer_id)")
        .eq("invoices.customer_id", id)
        .order("payment_date", { ascending: false })
        .limit(20),
      supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  const customer = customerRaw as unknown as Customer | null;
  const contacts = contactsRaw as unknown as ContactLog[] | null;
  const invoices = invoicesRaw as unknown as Invoice[] | null;
  const balance = balanceRaw as unknown as CustomerBalance | null;
  const quotes = (quotesRaw ?? []) as Array<{
    id: string; quote_number: string; status: string; total_amount: number; created_at: string; valid_until: string | null;
  }>;
  const allPayments = (paymentsRaw as unknown as Array<{
    id: string; invoice_id: string; payment_date: string;
    amount: number; payment_method: string | null; reference_no: string | null;
    invoices: { invoice_number: string; customer_id: string } | null;
  }> | null)?.filter(p => p.invoices?.customer_id === id) ?? [];

  // Build combined cari movements sorted by date
  const cariMovements = [
    ...(invoices ?? []).map(inv => ({
      id: inv.id,
      date: inv.invoice_date,
      type: "invoice" as const,
      description: `Fatura: ${inv.invoice_number}`,
      debit: inv.total_amount ?? 0,
      credit: 0,
      ref: inv.id,
    })),
    ...allPayments.map(p => ({
      id: p.id,
      date: p.payment_date,
      type: "payment" as const,
      description: `Ödeme: ${p.invoices?.invoice_number ?? ""} ${p.reference_no ? `(${p.reference_no})` : ""}`.trim(),
      debit: 0,
      credit: p.amount,
      ref: p.invoice_id,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let running = 0;
  const cariWithBalance = cariMovements.map(m => {
    running += m.debit - m.credit;
    return { ...m, balance: running };
  });

  if (!customer) notFound();

  const seg = SEGMENT_LABELS[customer.segment] || customer.segment;
  const segVariant = SEGMENT_VARIANTS[customer.segment] || "muted";

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/musteriler">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{customer.company_name}</h1>
              <Badge variant={segVariant}>{seg}</Badge>
            </div>
            {customer.contact_name && (
              <p className="text-sm text-slate-500 mt-0.5">{customer.contact_name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/musteriler/${id}/duzenle`}>
              <Pencil className="w-4 h-4" />
              Düzenle
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/musteriler/${id}/teklif/yeni`}>
              <FileText className="w-4 h-4" />
              Teklif Oluştur
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/iletisim/yeni?customer_id=${id}`}>
              <Plus className="w-4 h-4" />
              Temas Ekle
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Customer Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">İletişim Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`tel:${customer.phone}`} className="text-green-600 hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-green-600 hover:underline truncate">
                    {customer.email}
                  </a>
                </div>
              )}
              {(customer.city || customer.district) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">
                    {[customer.district, customer.city].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {customer.address && (
                <p className="text-sm text-slate-500 pl-6">{customer.address}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vergi Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.tax_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">{customer.tax_number}</span>
                </div>
              )}
              {customer.tax_office && (
                <p className="text-sm text-slate-500 pl-6">{customer.tax_office}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Finansal Özet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Toplam Fatura</span>
                <span className="font-semibold">{formatCurrency(balance?.total_invoiced)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ödenen</span>
                <span className="font-semibold text-green-600">{formatCurrency(balance?.total_paid)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                <span className="text-slate-700 font-medium">Bakiye</span>
                <span className={`font-bold ${(balance?.balance_due ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(balance?.balance_due)}
                </span>
              </div>
            </CardContent>
          </Card>

          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notlar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-slate-400 space-y-1 px-1">
            <p>Kaynak: {SOURCE_LABELS[customer.source || "manual"] || customer.source}</p>
            <p>Eklenme: {formatDate(customer.created_at)}</p>
            <p>Güncelleme: {formatDate(customer.updated_at)}</p>
          </div>
        </div>

        {/* Right: Activity */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact History */}
          <Card>
            <CardContent className="pt-5">
              <ContactHistory
                contacts={(contacts ?? []) as Array<{
                  id: string;
                  contact_type: string;
                  notes: string | null;
                  outcome: string | null;
                  direction: string | null;
                  subject: string | null;
                  contacted_at: string;
                  next_action_date: string | null;
                  next_action: string | null;
                }>}
                customerId={id}
              />
            </CardContent>
          </Card>

          {/* Quotes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" />
                  Teklifler ({quotes.length})
                </CardTitle>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link href={`/musteriler/${id}/teklif/yeni`}>
                    <Plus className="w-3 h-3" /> Teklif Oluştur
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {quotes.length > 0 ? (
                <div className="space-y-2">
                  {quotes.map(q => (
                    <Link
                      key={q.id}
                      href={`/musteriler/${id}/teklif/${q.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-700">{q.quote_number}</span>
                        <span className="text-slate-400 text-xs ml-2">{formatDate(q.created_at)}</span>
                        {q.valid_until && (
                          <span className="text-slate-400 text-xs ml-2">· Geçerli: {formatDate(q.valid_until)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            q.status === "accepted" ? "success" :
                            q.status === "rejected" ? "destructive" :
                            q.status === "sent" ? "warning" : "secondary"
                          }
                          className="text-xs"
                        >
                          {QUOTE_STATUS_LABELS[q.status] ?? q.status}
                        </Badge>
                        <span className="font-semibold">{formatCurrency(q.total_amount)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Henüz teklif bulunmuyor</p>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-green-500" />
                  Faturalar ({invoices?.length ?? 0})
                </CardTitle>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link href={`/finans/faturalar/yeni?customer_id=${id}`}>
                    <Plus className="w-3 h-3" /> Fatura Oluştur
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href={`/finans/faturalar/${inv.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-700">{inv.invoice_number}</span>
                        <span className="text-slate-400 text-xs ml-2">{formatDate(inv.invoice_date)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            inv.status === "paid" ? "success" :
                            inv.status === "overdue" ? "destructive" :
                            inv.status === "partially_paid" ? "warning" : "secondary"
                          }
                          className="text-xs"
                        >
                          {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                        </Badge>
                        <span className="font-semibold">{formatCurrency(inv.total_amount)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">
                  Henüz fatura bulunmuyor
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cari Hareketler */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-500" />
                Cari Hesap Hareketleri
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {cariWithBalance.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="pl-4 text-xs">Tarih</TableHead>
                      <TableHead className="text-xs">Hareket</TableHead>
                      <TableHead className="text-right text-xs text-red-600">Borç</TableHead>
                      <TableHead className="text-right text-xs text-green-600">Ödeme</TableHead>
                      <TableHead className="text-right pr-4 text-xs">Bakiye</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...cariWithBalance].reverse().map((m) => (
                      <TableRow key={m.id} className="text-sm">
                        <TableCell className="pl-4 text-slate-500 text-xs whitespace-nowrap">
                          {formatDate(m.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {m.type === "invoice" ? (
                              <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                            )}
                            {m.type === "invoice" ? (
                              <Link href={`/finans/faturalar/${m.ref}`} className="text-xs text-green-700 hover:underline">
                                {m.description}
                              </Link>
                            ) : (
                              <span className="text-xs text-slate-600">{m.description}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-red-600">
                          {m.debit > 0 ? formatCurrency(m.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-green-600">
                          {m.credit > 0 ? formatCurrency(m.credit) : "-"}
                        </TableCell>
                        <TableCell className={`text-right pr-4 text-xs font-bold ${m.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatCurrency(m.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">Henüz hareket yok</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
