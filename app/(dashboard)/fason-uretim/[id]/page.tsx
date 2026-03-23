import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatNumber, formatCurrency, PRODUCTION_STATUS_LABELS } from "@/lib/utils";
import { addDelivery } from "@/actions/production-orders";
import type { ProductionOrder, ProductionDelivery, Supplier, Product } from "@/lib/db-types";

type OrderWithRelations = ProductionOrder & {
  suppliers: Pick<Supplier, "company_name" | "phone" | "city"> | null;
  products: Pick<Product, "name" | "unit"> | null;
};

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "muted" | "destructive"> = {
  planned: "warning",
  in_production: "info",
  partial_delivery: "warning",
  completed: "success",
  cancelled: "destructive",
};

export default async function FasonSiparisDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: orderRaw }, { data: deliveriesRaw }] = await Promise.all([
    supabase
      .from("production_orders")
      .select("*, suppliers(company_name, phone, city), products(name, unit)")
      .eq("id", id)
      .single(),
    supabase
      .from("production_deliveries")
      .select("*")
      .eq("production_order_id", id)
      .order("delivery_date", { ascending: false }),
  ]);
  const order = orderRaw as unknown as OrderWithRelations | null;
  const deliveries = deliveriesRaw as unknown as ProductionDelivery[] | null;

  if (!order) notFound();

  const pct = order.ordered_quantity > 0
    ? Math.min((order.received_quantity / order.ordered_quantity) * 100, 100)
    : 0;
  const remaining = order.ordered_quantity - order.received_quantity;
  const isCompleted = order.status === "completed" || order.status === "cancelled";

  const action = addDelivery.bind(null);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/fason-uretim">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{order.order_number}</h1>
              <Badge variant={STATUS_VARIANT[order.status] || "secondary"} className="text-xs">
                {PRODUCTION_STATUS_LABELS[order.status] || order.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {(order.suppliers as { company_name: string } | null)?.company_name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Order Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sipariş Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-400 text-xs">Ürün</p>
                <p className="font-medium">{(order.products as { name: string; unit: string } | null)?.name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Tedarikçi</p>
                <p className="font-medium">{(order.suppliers as { company_name: string; phone: string } | null)?.company_name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Sipariş Tarihi</p>
                <p className="font-medium">{formatDate(order.order_date)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Beklenen Tarih</p>
                <p className="font-medium">{formatDate(order.expected_date)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Birim Maliyet</p>
                <p className="font-medium">{formatCurrency(order.unit_cost)}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs">Toplam Maliyet</p>
                <p className="font-bold text-green-700">
                  {order.unit_cost ? formatCurrency(order.ordered_quantity * order.unit_cost) : "-"}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Teslim Durumu</span>
                <span className="font-medium">
                  {formatNumber(order.received_quantity)} / {formatNumber(order.ordered_quantity)}{" "}
                  {(order.products as { name: string; unit: string } | null)?.unit}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="h-2.5 bg-green-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">%{pct.toFixed(0)} teslim alındı</p>
            </div>

            {order.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-slate-400">Notlar</p>
                <p className="text-sm text-slate-600 mt-0.5">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Delivery */}
        {!isCompleted && remaining > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Teslimat Ekle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={action} className="space-y-3">
                <input type="hidden" name="production_order_id" value={id} />
                <div className="space-y-1.5">
                  <Label className="text-xs">Teslim Alınan Miktar *</Label>
                  <Input
                    name="delivered_quantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={remaining}
                    placeholder={`Maks: ${remaining}`}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Teslim Tarihi *</Label>
                  <Input name="delivery_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Araç Plakası</Label>
                  <Input name="vehicle_plate" placeholder="34 ABC 123" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sürücü Adı</Label>
                  <Input name="driver_name" placeholder="Ad Soyad" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notlar</Label>
                  <Textarea name="notes" placeholder="Teslimat notları..." rows={2} />
                </div>
                <Button type="submit" className="w-full" size="sm">
                  Teslim Alındı Olarak Kaydet
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delivery Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Teslimat Geçmişi ({deliveries?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {deliveries && deliveries.length > 0 ? (
            <div className="space-y-3">
              {deliveries.map((d) => (
                <div key={d.id} className="flex gap-4 p-3 bg-green-50 rounded-lg">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green-700">
                        +{formatNumber(d.delivered_quantity)} {(order.products as { name: string; unit: string } | null)?.unit}
                      </span>
                      <span className="text-sm text-slate-500">{formatDate(d.delivery_date)}</span>
                    </div>
                    {d.vehicle_plate && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        Plaka: {d.vehicle_plate}
                        {d.driver_name ? ` · Sürücü: ${d.driver_name}` : ""}
                      </p>
                    )}
                    {d.notes && <p className="text-xs text-slate-400 mt-1">{d.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Henüz teslimat kaydı yok</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
