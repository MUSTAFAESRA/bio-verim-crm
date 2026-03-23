import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductDeleteButton } from "@/components/depo/product-delete-button";
import type { Product } from "@/lib/db-types";

export default async function UrunlerPage() {
  const supabase = await createClient();
  const { data: productsRaw } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("name");
  const products = productsRaw as unknown as Product[] | null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Ürün Kataloğu</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tüm sıvı organik gübre ürünleri</p>
        </div>
        <Button asChild size="sm">
          <Link href="/depo/urunler/yeni">
            <Plus className="w-4 h-4" />
            Yeni Ürün
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Ürün Adı</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Mevcut Stok</TableHead>
              <TableHead className="text-right">Min. Stok</TableHead>
              <TableHead className="text-right">Alış Fiyatı</TableHead>
              <TableHead className="text-right">Satış Fiyatı</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products && products.length > 0 ? (
              products.map((p) => {
                const isLow = p.current_stock <= p.min_stock_level;
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-slate-50">
                    <TableCell>
                      <Link href={`/depo/urunler/${p.id}`} className="font-medium text-slate-800 hover:text-green-700 flex items-center gap-1.5">
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{p.sku}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{p.category || "-"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${isLow ? "text-red-600" : "text-slate-800"}`}>
                        {formatNumber(p.current_stock)} {p.unit}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-slate-500 text-sm">
                      {formatNumber(p.min_stock_level)} {p.unit}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.unit_cost)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(p.unit_price)}</TableCell>
                    <TableCell>
                      <Badge variant={isLow ? "destructive" : "success"} className="text-xs">
                        {isLow ? "Kritik" : "Normal"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                          <Link href={`/depo/urunler/${p.id}`}>
                            <Pencil className="w-4 h-4 text-slate-400 hover:text-slate-700" />
                          </Link>
                        </Button>
                        <ProductDeleteButton id={p.id} name={p.name} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                  Ürün bulunamadı.{" "}
                  <Link href="/depo/urunler/yeni" className="text-green-600 hover:underline">
                    İlk ürünü ekleyin
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
