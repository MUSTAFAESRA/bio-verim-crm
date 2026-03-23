import { createClient } from "@/lib/supabase/server";
import { addStockMovement } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function StokGirisPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, unit, current_stock")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/depo">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Stok Girişi</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={addStockMovement} className="space-y-4">
          <input type="hidden" name="movement_type" value="in" />
          <input type="hidden" name="source_type" value="manual" />

          <div className="space-y-1.5">
            <Label htmlFor="product_id">Ürün *</Label>
            <select
              id="product_id"
              name="product_id"
              required
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">Ürün seçin...</option>
              {products?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Mevcut: {p.current_stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Miktar *</Label>
              <Input id="quantity" name="quantity" type="number" min="0.01" step="0.01" required placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_cost">Birim Maliyet (₺)</Label>
              <Input id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Açıklama / Notlar</Label>
            <Textarea id="notes" name="notes" placeholder="Giriş nedeni, kaynak vb." rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">Stok Girişi Kaydet</Button>
            <Button asChild variant="outline">
              <Link href="/depo">İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
