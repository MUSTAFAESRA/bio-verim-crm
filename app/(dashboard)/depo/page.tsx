import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Package, Plus, AlertTriangle, TrendingDown, ArrowRight, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import type { Product, LowStockProduct, StockMovement } from "@/lib/db-types";

type MovementWithProduct = StockMovement & { products: { name: string; unit: string } | null };

export default async function DepoPage() {
  const supabase = await createClient();

  const [{ data: productsRaw }, { data: lowStockRaw }, { data: recentMovementsRaw }] = await Promise.all([
    supabase.from("products").select("*").eq("is_active", true).order("name"),
    supabase.from("low_stock_products").select("*").order("shortage", { ascending: false }),
    supabase
      .from("stock_movements")
      .select("id, created_at, movement_type, source_type, quantity, notes, products(name, unit)")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const products = productsRaw as unknown as Product[] | null;
  const lowStock = lowStockRaw as unknown as LowStockProduct[] | null;
  const recentMovements = recentMovementsRaw as unknown as MovementWithProduct[] | null;

  const totalProducts = products?.length ?? 0;
  const totalStock = products?.reduce((sum, p) => sum + (p.current_stock || 0), 0) ?? 0;
  const lowStockCount = lowStock?.length ?? 0;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Depo / Envanter</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/depo/giris">
              <Plus className="w-4 h-4" />
              Stok Girişi
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/depo/cikis">
              <TrendingDown className="w-4 h-4" />
              Stok Çıkışı
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/depo/urunler/yeni">
              <Plus className="w-4 h-4" />
              Yeni Ürün
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Toplam Ürün</p>
                <p className="text-2xl font-bold text-slate-800">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Toplam Stok (Litre/Kg)</p>
                <p className="text-2xl font-bold text-slate-800">{formatNumber(totalStock)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? "bg-red-50" : "bg-green-50"}`}>
                <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">Kritik Stok</p>
                <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>
                  {lowStockCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Products Table */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Stok Durumu</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/depo/urunler">
                  Tüm Ürünler <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {products && products.length > 0 ? (
              <div className="space-y-3">
                {products.slice(0, 8).map((product) => {
                  const pct = product.min_stock_level > 0
                    ? Math.min((product.current_stock / product.min_stock_level) * 100, 100)
                    : 100;
                  const isLow = product.current_stock <= product.min_stock_level;

                  return (
                    <Link key={product.id} href={`/depo/urunler/${product.id}`} className="block hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{product.name}</span>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                        <span className="text-sm font-semibold text-slate-800">
                          {formatNumber(product.current_stock)} {product.unit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${isLow ? "bg-red-400" : "bg-green-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Min: {formatNumber(product.min_stock_level)} {product.unit}</p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">Henüz ürün eklenmemiş</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/depo/urunler/yeni">Ürün Ekle</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-slate-500" />
                Son Hareketler
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/depo/hareketler">
                  Tümü <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentMovements && recentMovements.length > 0 ? (
              <div className="space-y-2">
                {recentMovements.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-slate-50">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      m.movement_type === "in" ? "bg-green-100 text-green-700" :
                      m.movement_type === "out" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {m.movement_type === "in" ? "+" : m.movement_type === "out" ? "-" : "~"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-700 truncate">
                        {(m.products as { name: string; unit: string } | null)?.name || "-"}
                      </p>
                      <p className="text-xs text-slate-400">{m.notes || m.source_type}</p>
                    </div>
                    <span className={`font-semibold flex-shrink-0 ${
                      m.movement_type === "in" ? "text-green-600" :
                      m.movement_type === "out" ? "text-red-600" :
                      "text-amber-600"
                    }`}>
                      {m.movement_type === "in" ? "+" : "-"}{formatNumber(m.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-6">Henüz hareket yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
