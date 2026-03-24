import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatDate, formatCurrency } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CariDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customerRaw }, { data: invoicesRaw }, { data: balanceRaw }] = await Promise.all([
    supabase.from("customers").select("id, company_name, contact_name").eq("id", id).single(),
    supabase.from("invoices").select("*").eq("customer_id", id).eq("invoice_type", "sale").order("invoice_date"),
    supabase.from("customer_balance").select("*").eq("id", id).single(),
  ]);

  if (!customerRaw) notFound();

  const customer = customerRaw as { id: string; company_name: string; contact_name: string | null };
  const invoices = (invoicesRaw ?? []) as Array<{
    id: string; invoice_number: string; invoice_date: string;
    total_amount: number; paid_amount: number; status: string;
  }>;
  const balance = balanceRaw as { total_invoiced: number; total_paid: number; balance_due: number } | null;

  // Fetch payments for this customer's invoices
  const invoiceIds = invoices.map(i => i.id);
  const { data: paymentsRaw } = invoiceIds.length > 0
    ? await supabase.from("bv_payments").select("*, invoices(invoice_number)").in("invoice_id", invoiceIds).order("payment_date")
    : { data: [] };

  const payments = (paymentsRaw ?? []) as Array<{
    id: string; invoice_id: string; payment_date: string; amount: number;
    payment_method: string | null; reference_no: string | null;
    invoices: { invoice_number: string } | null;
  }>;

  // Build cari movements
  const movements = [
    ...invoices.map(inv => ({
      id: inv.id, date: inv.invoice_date, type: "invoice" as const,
      description: `Fatura Kesildi: ${inv.invoice_number}`,
      debit: inv.total_amount ?? 0, credit: 0, ref: inv.id,
    })),
    ...payments.map(p => ({
      id: p.id, date: p.payment_date, type: "payment" as const,
      description: `Ödeme Alındı: ${p.invoices?.invoice_number ?? ""} ${p.reference_no ? `(${p.reference_no})` : ""}`.trim(),
      debit: 0, credit: p.amount, ref: p.invoice_id,
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
          <Link href="/finans/cari"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{customer.company_name}</h1>
          <p className="text-sm text-slate-500">Cari Hesap Ekstresi</p>
        </div>
        <div className="ml-auto">
          <Button asChild variant="outline" size="sm">
            <Link href={`/musteriler/${id}`}>Müşteri Profili</Link>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Toplam Borç</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(balance?.total_invoiced)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Toplam Ödeme</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(balance?.total_paid)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Kalan Bakiye</p>
          <p className={`text-xl font-bold mt-1 ${(balance?.balance_due ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatCurrency(balance?.balance_due)}
          </p>
        </div>
      </div>

      {/* Movements */}
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
                  <TableHead className="text-xs">Hareket Açıklaması</TableHead>
                  <TableHead className="text-right text-xs text-red-600">Borç (₺)</TableHead>
                  <TableHead className="text-right text-xs text-green-600">Ödeme (₺)</TableHead>
                  <TableHead className="text-right pr-6 text-xs">Bakiye (₺)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...movementsWithBalance].reverse().map((m) => (
                  <TableRow key={m.id} className="text-sm">
                    <TableCell className="pl-6 text-slate-500 text-xs whitespace-nowrap">
                      {formatDate(m.date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {m.type === "invoice"
                          ? <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          : <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
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
