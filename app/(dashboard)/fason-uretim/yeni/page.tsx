import { createClient } from "@/lib/supabase/server";
import { createProductionOrder } from "@/actions/production-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function YeniFasonSiparisPage() {
  const supabase = await createClient();
  const [{ data: suppliers }, { data: products }] = await Promise.all([
    supabase.from("suppliers").select("id, company_name").eq("is_active", true).order("company_name"),
    supabase.from("products").select("id, name, unit").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/fason-uretim">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Yeni Fason Sipariş</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={createProductionOrder} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="supplier_id">Tedarikçi Tesis *</Label>
            <select
              id="supplier_id"
              name="supplier_id"
              required
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">Tedarikçi seçin...</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>{s.company_name}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400">
              <Link href="/fason-uretim/tedarikci/yeni" className="text-green-600 hover:underline">
                Yeni tedarikçi ekle
              </Link>
            </p>
          </div>

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
                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ordered_quantity">Sipariş Miktarı *</Label>
              <Input id="ordered_quantity" name="ordered_quantity" type="number" min="1" step="0.01" required placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit_cost">Birim Maliyet (₺)</Label>
              <Input id="unit_cost" name="unit_cost" type="number" step="0.01" min="0" placeholder="0.00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="order_date">Sipariş Tarihi *</Label>
              <Input id="order_date" name="order_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expected_date">Beklenen Teslim Tarihi</Label>
              <Input id="expected_date" name="expected_date" type="date" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea id="notes" name="notes" placeholder="Sipariş notları, özel talepler..." rows={2} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Sipariş Oluştur</Button>
            <Button asChild variant="outline">
              <Link href="/fason-uretim">İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
