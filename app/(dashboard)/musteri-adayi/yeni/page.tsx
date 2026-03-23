import { createLead } from "@/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function YeniAdayPage() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/musteri-adayi">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Manuel Aday Ekle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={createLead} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="business_name">İşletme / Firma Adı *</Label>
              <Input id="business_name" name="business_name" required placeholder="Örn: Yeşil Tarım Çiftliği" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact_name">İlgili Kişi</Label>
              <Input id="contact_name" name="contact_name" placeholder="Ad Soyad" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" placeholder="0532 xxx xx xx" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="info@ciftlik.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">İl</Label>
              <Input id="city" name="city" placeholder="Bursa" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="address">Adres</Label>
              <Input id="address" name="address" placeholder="Köy/Mahalle, İlçe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Kaynak</Label>
              <select
                id="source"
                name="source"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="manual">Manuel</option>
                <option value="linkedin">LinkedIn</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" name="notes" placeholder="Potansiyel müşteri hakkında notlar..." rows={3} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Aday Ekle</Button>
            <Button asChild variant="outline">
              <Link href="/musteri-adayi">İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
