import { createCustomer } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function YeniMusteriPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/musteriler">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Yeni Müşteri Ekle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={createCustomer} className="space-y-5">
          {/* Firma Bilgileri */}
          <div>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">
              Firma Bilgileri
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="company_name">Firma Adı *</Label>
                <Input id="company_name" name="company_name" placeholder="Örn: Çiftçi Tarım Ltd." required />
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
                <Input id="email" name="email" type="email" placeholder="info@firma.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax_number">Vergi No</Label>
                <Input id="tax_number" name="tax_number" placeholder="1234567890" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tax_office">Vergi Dairesi</Label>
                <Input id="tax_office" name="tax_office" placeholder="Kadıköy VD" />
              </div>
            </div>
          </div>

          {/* Adres */}
          <div>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Adres</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">İl</Label>
                <Input id="city" name="city" placeholder="İstanbul" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district">İlçe</Label>
                <Input id="district" name="district" placeholder="Kadıköy" />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address">Açık Adres</Label>
                <Textarea id="address" name="address" placeholder="Sokak, No, Mahalle..." rows={2} />
              </div>
            </div>
          </div>

          {/* CRM Bilgileri */}
          <div>
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">CRM Bilgileri</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="segment">Segment</Label>
                <select
                  id="segment"
                  name="segment"
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="lead">Aday</option>
                  <option value="active">Aktif</option>
                  <option value="passive">Pasif</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="source">Kaynak</Label>
                <select
                  id="source"
                  name="source"
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                >
                  <option value="manual">Manuel</option>
                  <option value="referral">Referans</option>
                  <option value="google_places">Google Places</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook_lead">Facebook</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea id="notes" name="notes" placeholder="Müşteri hakkında notlar..." rows={3} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Müşteri Ekle</Button>
            <Button asChild type="button" variant="outline">
              <Link href="/musteriler">İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
