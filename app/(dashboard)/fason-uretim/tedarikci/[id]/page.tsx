import { createClient } from "@/lib/supabase/server";
import { updateSupplier } from "@/actions/production-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import type { Supplier } from "@/lib/db-types";

export default async function TedarikciDuzenlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("suppliers").select("*").eq("id", id).single();
  const supplier = data as unknown as Supplier | null;

  if (!supplier) notFound();

  const action = updateSupplier.bind(null, id);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/fason-uretim/tedarikci">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Tedarikçi Düzenle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="company_name">Tesis / Firma Adı *</Label>
              <Input
                id="company_name"
                name="company_name"
                required
                defaultValue={supplier.company_name}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Yetkili Kişi</Label>
              <Input
                id="contact_name"
                name="contact_name"
                defaultValue={supplier.contact_name ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={supplier.phone ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={(supplier as unknown as { email?: string }).email ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">İl</Label>
              <Input
                id="city"
                name="city"
                defaultValue={supplier.city ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity_liters">Günlük Kapasite (Litre)</Label>
              <Input
                id="capacity_liters"
                name="capacity_liters"
                type="number"
                min="0"
                defaultValue={supplier.capacity_liters ?? ""}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                name="address"
                rows={2}
                defaultValue={(supplier as unknown as { address?: string }).address ?? ""}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={(supplier as unknown as { notes?: string }).notes ?? ""}
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="is_active">Durum</Label>
              <select
                id="is_active"
                name="is_active"
                defaultValue={supplier.is_active ? "true" : "false"}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Değişiklikleri Kaydet</Button>
            <Button asChild variant="outline">
              <Link href="/fason-uretim/tedarikci">İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
