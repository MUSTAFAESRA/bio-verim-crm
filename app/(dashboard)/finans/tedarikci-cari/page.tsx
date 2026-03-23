import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function TedarikciCariPage() {
  const supabase = await createClient();
  const { data: balancesRaw } = await supabase
    .from("supplier_balance")
    .select("*")
    .order("balance_due", { ascending: false });

  const balances = (balancesRaw ?? []) as Array<{
    id: string; company_name: string; city: string | null;
    total_invoiced: number; total_paid: number; balance_due: number;
  }>;

  const totalDebt = balances.reduce((s, b) => s + (b.balance_due > 0 ? b.balance_due : 0), 0);
  const totalInvoiced = balances.reduce((s, b) => s + b.total_invoiced, 0);
  const totalPaid = balances.reduce((s, b) => s + b.total_paid, 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Tedarikçi / Fason Üretici Cari</h1>
          <p className="text-sm text-slate-500 mt-0.5">Alış faturaları ve ödemeler bazında borç takibi</p>
        </div>
        <Button asChild size="sm">
          <Link href="/finans/faturalar/yeni">
            <Plus className="w-4 h-4" />
            Alış Faturası Ekle
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Toplam Alış Faturası</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Yapılan Ödeme</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Toplam Borcumuz</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="pl-6">Tedarikçi</TableHead>
              <TableHead>Şehir</TableHead>
              <TableHead className="text-right">Toplam Fatura</TableHead>
              <TableHead className="text-right">Ödenen</TableHead>
              <TableHead className="text-right pr-6">Bakiye (Borcumuz)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.filter(b => b.total_invoiced > 0).length > 0 ? (
              balances.filter(b => b.total_invoiced > 0).map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="pl-6">
                    <Link href={`/finans/tedarikci-cari/${b.id}`} className="font-medium text-green-700 hover:underline">
                      {b.company_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{b.city ?? "-"}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(b.total_invoiced)}</TableCell>
                  <TableCell className="text-right text-sm text-green-600">{formatCurrency(b.total_paid)}</TableCell>
                  <TableCell className="text-right pr-6">
                    <Badge
                      variant={b.balance_due > 0 ? "destructive" : b.balance_due < 0 ? "success" : "secondary"}
                      className="text-sm font-bold"
                    >
                      {formatCurrency(b.balance_due)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                  Henüz alış faturası kaydı yok.{" "}
                  <Link href="/finans/faturalar/yeni" className="text-green-600 hover:underline">
                    Alış faturası ekleyin
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
