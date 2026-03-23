import { createClient } from "@/lib/supabase/server";
import { updateProduct } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export default async function UrunDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();

  if (!data) notFound();

  const product = data as {
    id: string;
    name: string;
    sku: string;
    category?: string | null;
    unit: string;
    min_stock_level?: number | null;
    unit_cost?: number | null;
    unit_price?: number | null;
    description?: string | null;
    current_stock?: number;
    is_active?: boolean;
  };

  const action = updateProduct.bind(null, id);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/depo/urunler">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Ürün Düzenle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Ürün Adı *</Label>
              <Input id="name" name="name" required defaultValue={product.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU / Stok Kodu *</Label>
              <Input id="sku" name="sku" required defaultValue={product.sku} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Kategori</Label>
              <Input id="category" name="category" defaultValue={product.category ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Birim</Label>
              <select
                id="unit"
                name="unit"
                defaultValue={product.unit}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="litre">Litre</option>
                <option value="kg">Kilogram</option>
                <option value="ton">Ton</option>
                <option value="adet">Adet</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min_stock_level">Min. Stok Seviyesi</Label>
              <Input
                id="min_stock_level"
                name="min_stock_level"
                type="number"
                min="0"
                defaultValue={product.min_stock_level ?? 0}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_cost">Alış Fiyatı (₺)</Label>
              <Input
                id="unit_cost"
                name="unit_cost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product.unit_cost ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_price">Satış Fiyatı (₺)</Label>
              <Input
                id="unit_price"
                name="unit_price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={product.unit_price ?? ""}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={product.description ?? ""}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Değişiklikleri Kaydet</Button>
            <Button asChild variant="outline">
              <Link href="/depo/urunler">İptal</Link>
            </Button>
          </div>
        </form>
      </div>

      {/* Read-only info */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-sm text-slate-500 space-y-1">
        <p><span className="font-medium">Mevcut Stok:</span> {product.current_stock ?? 0} {product.unit}</p>
        <p className="text-xs">Stok miktarını değiştirmek için Stok Girişi / Çıkışı kullanın.</p>
      </div>
    </div>
  );
}
