import { createProduct } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function YeniUrunPage() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/depo/urunler">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Yeni Ürün Ekle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={createProduct} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Ürün Adı *</Label>
              <Input id="name" name="name" placeholder="Örn: Bio Verim Premium 5-0-0" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sku">SKU / Stok Kodu *</Label>
              <Input id="sku" name="sku" placeholder="BV-001" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Kategori</Label>
              <Input id="category" name="category" placeholder="Organik, NPK, Mikro..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Birim</Label>
              <select
                id="unit"
                name="unit"
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
              <Input id="min_stock_level" name="min_stock_level" type="number" min="0" defaultValue="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_cost">Alış Fiyatı (₺)</Label>
              <Input id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_price">Satış Fiyatı (₺)</Label>
              <Input id="unit_price" name="unit_price" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea id="description" name="description" placeholder="Ürün özellikleri, NPK değerleri vb." rows={3} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Ürün Ekle</Button>
            <Button asChild variant="outline">
              <Link href="/depo/urunler">İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
