import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Factory, ArrowRight, Package, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatNumber, formatCurrency, PRODUCTION_STATUS_LABELS } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, PackagePlus } from "lucide-react";
import type { ProductionOrder, Supplier, Product } from "@/lib/db-types";
import { deleteProductionOrder, addDelivery } from "@/actions/production-orders";

type OrderWithRelations = ProductionOrder & {
  suppliers: Pick<Supplier, "company_name"> | null;
  products: Pick<Product, "name" | "unit"> | null;
};

export default async function FasonUretimPage() {
  const supabase = await createClient();

  const [{ data: ordersRaw }, { data: suppliersRaw }, { data: productsRaw }] = await Promise.all([
    supabase
      .from("production_orders")
      .select("*, suppliers(company_name), products(name, unit)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("suppliers")
      .select("id, company_name, city, is_active")
      .eq("is_active", true)
      .order("company_name"),
    supabase
      .from("products")
      .select("id, name, unit, current_stock, is_active")
      .eq("is_active", true)
      .order("name")
      .limit(10),
  ]);
  const orders = ordersRaw as unknown as OrderWithRelations[] | null;
  const suppliers = suppliersRaw as unknown as Pick<Supplier, "id" | "company_name" | "city" | "is_active">[] | null;
  const products = productsRaw as unknown as Pick<Product, "id" | "name" | "unit" | "current_stock">[] | null;

  const activeOrders = orders?.filter((o) => o.status !== "completed" && o.status !== "cancelled") ?? [];
  const completedOrders = orders?.filter((o) => o.status === "completed") ?? [];

  const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "muted" | "destructive"> = {
    planned: "warning",
    in_production: "info",
    partial_delivery: "warning",
    completed: "success",
    cancelled: "destructive",
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Fason Üretim Takibi</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/fason-uretim/tedarikci">
              <Factory className="w-4 h-4" />
              Tedarikçiler
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/fason-uretim/yeni">
              <Plus className="w-4 h-4" />
              Yeni Sipariş
            </Link>
          </Button>
        </div>
      </div>

      {/* Active Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Aktif Siparişler ({activeOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="pl-6">Sipariş No</TableHead>
                <TableHead>Tedarikçi</TableHead>
                <TableHead>Ürün</TableHead>
                <TableHead className="text-right">Sipariş / Teslim</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Beklenen Tarih</TableHead>
                <TableHead className="text-right pr-6">Maliyet</TableHead>
                <TableHead className="min-w-[180px]">Hızlı Stok Girişi</TableHead>
                <TableHead className="pr-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeOrders.length > 0 ? (
                activeOrders.map((order) => {
                  const pct = order.ordered_quantity > 0
                    ? Math.min((order.received_quantity / order.ordered_quantity) * 100, 100)
                    : 0;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="pl-6">
                        <Link href={`/fason-uretim/${order.id}`} className="font-medium text-green-700 hover:underline text-sm">
                          {order.order_number}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {(order.suppliers as { company_name: string } | null)?.company_name}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {(order.products as { name: string; unit: string } | null)?.name}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div>
                          <span className="font-medium">{formatNumber(order.received_quantity)}</span>
                          <span className="text-slate-400">/{formatNumber(order.ordered_quantity)}</span>
                          <span className="text-slate-400 ml-1">{(order.products as { name: string; unit: string } | null)?.unit}</span>
                        </div>
                        <div className="w-20 ml-auto mt-1 bg-slate-100 rounded-full h-1.5">
                          <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[order.status] || "secondary"} className="text-xs">
                          {PRODUCTION_STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(order.expected_date)}</TableCell>
                      <TableCell className="text-right pr-6 text-sm">
                        {order.unit_cost ? formatCurrency(order.ordered_quantity * order.unit_cost) : "-"}
                      </TableCell>
                      <TableCell>
                        {order.status !== "completed" && order.status !== "cancelled" && (
                          <form action={addDelivery} className="flex items-center gap-1.5">
                            <input type="hidden" name="production_order_id" value={order.id} />
                            <input type="hidden" name="delivery_date" value={new Date().toISOString().split("T")[0]} />
                            <input
                              name="delivered_quantity"
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="Miktar"
                              required
                              className="w-20 h-7 px-2 rounded border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
                            />
                            <Button type="submit" size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700">
                              <PackagePlus className="w-3.5 h-3.5 mr-1" />
                              Ekle
                            </Button>
                          </form>
                        )}
                      </TableCell>
                      <TableCell className="pr-4">
                        <form action={deleteProductionOrder.bind(null, order.id)}>
                          <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-slate-400">
                    Aktif sipariş yok.{" "}
                    <Link href="/fason-uretim/yeni" className="text-green-600 hover:underline">
                      Yeni sipariş oluşturun
                    </Link>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Suppliers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Tedarikçi Tesisler</CardTitle>
              <div className="flex gap-1">
                <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                  <Link href="/fason-uretim/tedarikci/yeni">
                    <Plus className="w-3 h-3 mr-0.5" /> Ekle
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                  <Link href="/fason-uretim/tedarikci">
                    Tümü <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {suppliers && suppliers.length > 0 ? (
              <div className="space-y-2">
                {suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                        <Factory className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-700">{s.company_name}</p>
                        <p className="text-xs text-slate-400">{s.city}</p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                      <Link href={`/fason-uretim/tedarikci/${s.id}`}>
                        <Pencil className="w-3 h-3 text-slate-400" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm">Tedarikçi yok</p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/fason-uretim/tedarikci/yeni">Tedarikçi Ekle</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Ürün Kataloğu</CardTitle>
              <div className="flex gap-1">
                <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                  <Link href="/depo/urunler/yeni">
                    <Plus className="w-3 h-3 mr-0.5" /> Ekle
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                  <Link href="/depo/urunler">
                    Tümü <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {products && products.length > 0 ? (
              <div className="space-y-2">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-700 text-xs leading-tight">{p.name}</p>
                        <p className="text-xs text-slate-400">{formatNumber(p.current_stock)} {p.unit}</p>
                      </div>
                    </div>
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                      <Link href={`/depo/urunler/${p.id}`}>
                        <Pencil className="w-3 h-3 text-slate-400" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm">Ürün yok</p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/depo/urunler/yeni">Ürün Ekle</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Completed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Son Tamamlanan Siparişler</CardTitle>
          </CardHeader>
          <CardContent>
            {completedOrders.length > 0 ? (
              <div className="space-y-2">
                {completedOrders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    href={`/fason-uretim/${order.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-sm"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{order.order_number}</p>
                      <p className="text-xs text-slate-400">
                        {(order.products as { name: string; unit: string } | null)?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="success" className="text-xs">Tamamlandı</Badge>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.order_date)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-4">Tamamlanan sipariş yok</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
