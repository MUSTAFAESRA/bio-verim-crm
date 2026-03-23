import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerBalance } from "@/lib/db-types";

export default async function CariHesaplarPage() {
  const supabase = await createClient();
  const { data: balancesRaw } = await supabase
    .from("customer_balance")
    .select("*")
    .order("balance_due", { ascending: false });
  const balances = balancesRaw as unknown as CustomerBalance[] | null;

  const totalReceivable = balances?.reduce((sum, b) => sum + (b.balance_due > 0 ? b.balance_due : 0), 0) ?? 0;
  const totalInvoiced = balances?.reduce((sum, b) => sum + b.total_invoiced, 0) ?? 0;
  const totalPaid = balances?.reduce((sum, b) => sum + b.total_paid, 0) ?? 0;

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Cari Hesaplar</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Toplam Faturalanan</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Toplam Tahsilat</p>
          <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500">Açık Alacak</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalReceivable)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="pl-6">Müşteri</TableHead>
              <TableHead className="text-right">Toplam Fatura</TableHead>
              <TableHead className="text-right">Ödenen</TableHead>
              <TableHead className="text-right pr-6">Bakiye</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances && balances.length > 0 ? (
              balances.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="pl-6">
                    <Link href={`/finans/cari/${b.id}`} className="font-medium text-green-700 hover:underline">
                      {b.company_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(b.total_invoiced)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(b.total_paid)}</TableCell>
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
                <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                  Henüz cari bakiye verisi yok
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
