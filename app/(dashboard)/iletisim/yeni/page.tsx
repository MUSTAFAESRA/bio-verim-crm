import { createClient } from "@/lib/supabase/server";
import { createContactLog } from "@/actions/contact-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  searchParams: Promise<{ customer_id?: string }>;
}

export default async function YeniTemasPage({ searchParams }: PageProps) {
  const { customer_id } = await searchParams;
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, company_name, contact_name")
    .order("company_name")
    .limit(200);

  const redirectTo = customer_id ? `/musteriler/${customer_id}` : "/iletisim";

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={redirectTo}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Temas Kaydı Ekle</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form action={createContactLog} className="space-y-4">
          <input type="hidden" name="redirect_to" value={redirectTo} />

          <div className="space-y-1.5">
            <Label htmlFor="customer_id">Müşteri *</Label>
            <select
              id="customer_id"
              name="customer_id"
              required
              defaultValue={customer_id || ""}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">Müşteri seçin...</option>
              {customers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}{c.contact_name ? ` — ${c.contact_name}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact_type">Temas Türü *</Label>
              <select
                id="contact_type"
                name="contact_type"
                required
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="call">📞 Telefon</option>
                <option value="visit">🤝 Ziyaret</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">📧 E-posta</option>
                <option value="meeting">👥 Toplantı</option>
                <option value="other">Diğer</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="direction">Yön</Label>
              <select
                id="direction"
                name="direction"
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="outbound">Giden (Biz aradık)</option>
                <option value="inbound">Gelen (Bizi aradı)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contacted_at">Temas Tarihi/Saati</Label>
              <Input
                id="contacted_at"
                name="contacted_at"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration_mins">Süre (dakika)</Label>
              <Input id="duration_mins" name="duration_mins" type="number" min="1" placeholder="5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subject">Konu</Label>
            <Input id="subject" name="subject" placeholder="Görüşme konusu" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Görüşme Notları</Label>
            <Textarea id="notes" name="notes" placeholder="Görüşmede konuşulanlar..." rows={3} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outcome">Sonuç</Label>
            <select
              id="outcome"
              name="outcome"
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="">— Seçiniz —</option>
              <option value="interested">İlgili</option>
              <option value="not_interested">İlgisiz</option>
              <option value="follow_up">Takip Gerekli</option>
              <option value="sale_made">Satış Yapıldı</option>
              <option value="no_answer">Cevap Yok</option>
              <option value="other">Diğer</option>
            </select>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-sm font-medium text-slate-600">Sonraki Aksiyon (Hatırlatıcı)</p>
            <div className="space-y-1.5">
              <Label htmlFor="next_action">Yapılacak İş</Label>
              <Input id="next_action" name="next_action" placeholder="Örn: Teklif gönder, Ara, Ziyaret et" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="next_action_date">Hatırlatma Tarihi</Label>
              <Input id="next_action_date" name="next_action_date" type="date" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Temas Kaydını Ekle</Button>
            <Button asChild variant="outline">
              <Link href={redirectTo}>İptal</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
