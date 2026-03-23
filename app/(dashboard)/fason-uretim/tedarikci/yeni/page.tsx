import { createSupplier } from "@/actions/production-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function YeniTedarikciPage() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/fason-uretim/tedarikci">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Yeni Tedarikçi Ekle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={createSupplier} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="company_name">Tesis / Firma Adı *</Label>
              <Input id="company_name" name="company_name" required placeholder="Örn: Yeşil Kimya Üretim A.Ş." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">Yetkili Kişi</Label>
              <Input id="contact_name" name="contact_name" placeholder="Ad Soyad" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" placeholder="0532 xxx xx xx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="info@tesis.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">İl</Label>
              <Input id="city" name="city" placeholder="İzmir" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity_liters">Günlük Kapasite (Litre)</Label>
              <Input id="capacity_liters" name="capacity_liters" type="number" min="0" placeholder="0" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="address">Adres</Label>
              <Textarea id="address" name="address" rows={2} placeholder="Tesis adresi" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="Özel notlar, sertifikalar vb." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Tedarikçi Ekle</Button>
            <Button asChild variant="outline">
              <Link href="/fason-uretim/tedarikci">İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
