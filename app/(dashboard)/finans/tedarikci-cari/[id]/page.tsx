import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";
import { confirmInvoice } from "@/actions/invoices";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TedarikciCariDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: supplierRaw }, { data: invoicesRaw }, { data: balanceRaw }] = await Promise.all([
    supabase.from("suppliers").select("id, company_name, city, phone").eq("id", id).single(),
    supabase.from("invoices").select("*").eq("supplier_id", id).eq("invoice_type", "purchase").order("invoice_date"),
    supabase.from("supplier_balance").select("*").eq("id", id).single(),
  ]);

  if (!supplierRaw) notFound();

  const supplier = supplierRaw as { id: string; company_name: string; city: string | null; phone: string | null };
  const invoices = (invoicesRaw ?? []) as Array<{
    id: string; invoice_number: string; invoice_date: string; total_amount: number; paid_amount: number; status: string; notes: string | null;
  }>;
  const balance = balanceRaw as { total_invoiced: number; total_paid: number; balance_due: number } | null;

  const invoiceIds = invoices.map(i => i.id);
  const { data: paymentsRaw } = invoiceIds.length > 0
    ? await supabase.from("bv_payments").select("*, invoices(invoice_number)").in("invoice_id", invoiceIds).order("payment_date")
    : { data: [] };

  const payments = (paymentsRaw ?? []) as Array<{
    id: string; invoice_id: string; payment_date: string; amount: number;
    payment_method: string | null; reference_no: string | null;
    invoices: { invoice_number: string } | null;
  }>;

  const movements = [
    ...invoices.map(inv => ({
      id: inv.id, date: inv.invoice_date, type: "invoice" as const,
      description: `Alış Faturası: ${inv.invoice_number}`,
      notes: inv.notes,
      debit: inv.total_amount ?? 0, credit: 0, ref: inv.id,
      status: inv.status,
    })),
    ...payments.map(p => ({
      id: p.id, date: p.payment_date, type: "payment" as const,
      description: `Ödeme: ${p.invoices?.invoice_number ?? ""} ${p.reference_no ? `(${p.reference_no})` : ""}`.trim(),
      notes: null as string | null,
      debit: 0, credit: p.amount, ref: p.invoice_id,
      status: "paid" as string,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0;
  const movementsWithBalance = movements.map(m => {
    running += m.debit - m.credit;
    return { ...m, balance: running };
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/finans/tedarikci-cari"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{supplier.company_name}</h1>
          <p className="text-sm text-slate-500">Tedarikçi Cari Hesap Ekstresi{supplier.city ? ` · ${supplier.city}` : ""}</p>
        </div>
        <div className="ml-auto">
          <Button asChild variant="outline" size="sm">
            <Link href={`/finans/faturalar/yeni`}>Alış Faturası Ekle</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Toplam Alış</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(balance?.total_invoiced)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Yapılan Ödeme</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(balance?.total_paid)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Kalan Borcumuz</p>
          <p className={`text-xl font-bold mt-1 ${(balance?.balance_due ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(balance?.balance_due)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cari Hareketler ({movementsWithBalance.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {movementsWithBalance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="pl-6 text-xs">Tarih</TableHead>
                  <TableHead className="text-xs">Hareket</TableHead>
                  <TableHead className="text-xs">Durum</TableHead>
                  <TableHead className="text-right text-xs text-red-600">Borç (₺)</TableHead>
                  <TableHead className="text-right text-xs text-green-600">Ödeme (₺)</TableHead>
                  <TableHead className="text-right pr-6 text-xs">Bakiye (₺)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...movementsWithBalance].reverse().map((m) => (
                  <TableRow key={m.id} className={`text-sm ${m.status === "draft" ? "bg-amber-50" : ""}`}>
                    <TableCell className="pl-6 text-slate-500 text-xs whitespace-nowrap">{formatDate(m.date)}</TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex-shrink-0">
                          {m.type === "invoice"
                            ? <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                            : <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                        </div>
                        <div>
                          {m.type === "invoice" ? (
                            <Link href={`/finans/faturalar/${m.ref}`} className="text-xs text-green-700 hover:underline font-medium">
                              {m.description}
                            </Link>
                          ) : (
                            <span className="text-xs text-slate-600">{m.description}</span>
                          )}
                          {m.notes && (
                            <p className="text-xs text-slate-400 mt-0.5">{m.notes}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {m.type === "invoice" && m.status === "draft" ? (
                        <form action={confirmInvoice.bind(null, m.ref)}>
                          <button
                            type="submit"
                            className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded px-2 py-0.5 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Fatura Onayla
                          </button>
                        </form>
                      ) : m.type === "invoice" ? (
                        <Badge variant="success" className="text-xs">Onaylandı</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-red-600">
                      {m.debit > 0 ? formatCurrency(m.debit) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium text-green-600">
                      {m.credit > 0 ? formatCurrency(m.credit) : "-"}
                    </TableCell>
                    <TableCell className={`text-right pr-6 text-xs font-bold ${m.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(m.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-400 text-center py-10">Henüz hareket kaydı yok</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
