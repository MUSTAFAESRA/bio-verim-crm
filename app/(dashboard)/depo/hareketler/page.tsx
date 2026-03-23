import { createClient } from "@/lib/supabase/server";
import { formatDate, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StockMovement } from "@/lib/db-types";

type MovementWithProduct = StockMovement & { products: { name: string; unit: string } | null };

export default async function HareketlerPage() {
  const supabase = await createClient();
  const { data: movementsRaw } = await supabase
    .from("stock_movements")
    .select("id, created_at, movement_type, source_type, quantity, notes, products(name, unit)")
    .order("created_at", { ascending: false })
    .limit(200);
  const movements = movementsRaw as unknown as MovementWithProduct[] | null;

  const SOURCE_LABELS: Record<string, string> = {
    production_delivery: "Fason Teslimat",
    sale: "Satış",
    return: "İade",
    manual: "Manuel",
    adjustment: "Düzeltme",
  };

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Stok Hareketleri</h1>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Tarih</TableHead>
              <TableHead>Ürün</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead>Notlar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements && movements.length > 0 ? (
              movements.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm text-slate-500">{formatDate(m.created_at)}</TableCell>
                  <TableCell className="font-medium text-slate-700">
                    {(m.products as { name: string; unit: string } | null)?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={m.movement_type === "in" ? "success" : m.movement_type === "out" ? "destructive" : "warning"}
                      className="text-xs"
                    >
                      {m.movement_type === "in" ? "Giriş" : m.movement_type === "out" ? "Çıkış" : "Düzeltme"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {SOURCE_LABELS[m.source_type || ""] || m.source_type || "-"}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${
                    m.movement_type === "in" ? "text-green-600" :
                    m.movement_type === "out" ? "text-red-600" : "text-amber-600"
                  }`}>
                    {m.movement_type === "in" ? "+" : "-"}{formatNumber(m.quantity)}{" "}
                    {(m.products as { name: string; unit: string } | null)?.unit || ""}
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">{m.notes || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-slate-400">
                  Hareket kaydı bulunamadı
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
