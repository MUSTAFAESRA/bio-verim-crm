import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Receipt, TrendingUp, TrendingDown, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Invoice, CustomerBalance } from "@/lib/db-types";

type InvoiceWithParty = Invoice & {
  customers: { company_name: string } | null;
  suppliers: { company_name: string } | null;
};

export default async function FinansPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [
    { data: recentInvoicesRaw },
    { data: monthSalesRaw },
    { data: monthPurchasesRaw },
    { data: overdueInvoices },
    { data: topDebtorsRaw },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(company_name), suppliers(company_name)")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("invoice_type", "sale")
      .gte("invoice_date", firstOfMonth)
      .neq("status", "cancelled"),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("invoice_type", "purchase")
      .gte("invoice_date", firstOfMonth)
      .neq("status", "cancelled"),
    supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("status", "overdue"),
    supabase
      .from("customer_balance")
      .select("*")
      .gt("balance_due", 0)
      .order("balance_due", { ascending: false })
      .limit(5),
  ]);
  const recentInvoices = recentInvoicesRaw as unknown as InvoiceWithParty[] | null;
  const topDebtors = topDebtorsRaw as unknown as CustomerBalance[] | null;
  const monthSalesTyped = monthSalesRaw as unknown as { total_amount: number | null }[] | null;
  const monthPurchasesTyped = monthPurchasesRaw as unknown as { total_amount: number | null }[] | null;

  const monthRevenue = monthSalesTyped?.reduce((sum, i) => sum + (i.total_amount || 0), 0) ?? 0;
  const monthExpense = monthPurchasesTyped?.reduce((sum, i) => sum + (i.total_amount || 0), 0) ?? 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Finansal Takip</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/finans/cari">
              <Receipt className="w-4 h-4" />
              Cari Hesaplar
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/finans/faturalar/yeni">
              <Plus className="w-4 h-4" />
              Yeni Fatura
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Bu Ay Satış</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(monthRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Bu Ay Alış</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(monthExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Gecikmiş Fatura</p>
                <p className="text-xl font-bold text-amber-700">{overdueInvoices?.count ?? 0} adet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Son Faturalar</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/finans/faturalar">
                  Tümü <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="pl-6">Fatura No</TableHead>
                  <TableHead>Müşteri/Tedarikçi</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="text-right pr-6">Tutar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices?.map((inv) => {
                  const party = inv.invoice_type === "sale"
                    ? (inv.customers as { company_name: string } | null)?.company_name
                    : (inv.suppliers as { company_name: string } | null)?.company_name;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-6">
                        <Link href={`/finans/faturalar/${inv.id}`} className="font-medium text-green-700 hover:underline text-sm">
                          {inv.invoice_number}
                        </Link>
                        <Badge variant={inv.invoice_type === "sale" ? "success" : "info"} className="ml-2 text-xs">
                          {inv.invoice_type === "sale" ? "Satış" : "Alış"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{party || "-"}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell className="text-right pr-6 font-semibold text-sm">
                        {formatCurrency(inv.total_amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Debtors */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">En Yüksek Bakiyeler</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/finans/cari">
                  Tümü <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topDebtors && topDebtors.length > 0 ? (
              <div className="space-y-3">
                {topDebtors.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <Link
                      href={`/finans/cari/${d.id}`}
                      className="font-medium text-slate-700 hover:text-green-700 truncate max-w-[140px]"
                    >
                      {d.company_name}
                    </Link>
                    <span className="font-bold text-red-600 flex-shrink-0">
                      {formatCurrency(d.balance_due)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 text-center py-4">Açık bakiye yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
