import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, CheckCircle2, XCircle, Send, Clock, Phone, Globe, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateQuoteStatus, deleteQuote } from "@/actions/quotes";
import { formatDate, formatCurrency } from "@/lib/utils";
import QuoteShareButtons from "./quote-share-buttons";

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  sent: "Gönderildi",
  accepted: "Kabul Edildi",
  rejected: "Reddedildi",
  expired: "Süresi Doldu",
};

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "destructive" | "info"> = {
  draft: "secondary",
  sent: "warning",
  accepted: "success",
  rejected: "destructive",
  expired: "secondary",
};

// Bio Verim şirket bilgileri
const COMPANY = {
  name: "Bioverim Gübre ve Tarım Ürünleri A.Ş.",
  tagline: "Hayvansal ve Bitkisel Gübre Toptan Ticareti",
  address: "75.Yıl Mah. 11235 Sk. Yunus Emre Kobi Sanayi Sitesi B-3 Blok No:50",
  city: "Odunpazarı / Eskişehir",
  phone: "0532 152 50 23",
  email: "info@gubano.com",
  website: "gubano.com.tr",
  taxNumber: "1761105996",
  taxOffice: "Eskişehir Vergi Dairesi",
};

interface PageProps {
  params: Promise<{ id: string; quoteId: string }>;
}

export default async function TeklifDetayPage({ params }: PageProps) {
  const { id, quoteId } = await params;
  const supabase = await createClient();

  const [{ data: quoteRaw }, { data: itemsRaw }, { data: customerRaw }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", quoteId).single(),
    supabase.from("quote_items").select("*").eq("quote_id", quoteId).order("id"),
    supabase
      .from("customers")
      .select("id, company_name, contact_name, address, city, tax_number, tax_office, email, phone")
      .eq("id", id)
      .single(),
  ]);

  if (!quoteRaw || !customerRaw) notFound();

  const quote = quoteRaw as {
    id: string; customer_id: string; quote_number: string; status: string;
    valid_until: string | null; notes: string | null;
    subtotal: number; tax_rate: number; tax_amount: number; total_amount: number;
    created_at: string;
  };

  const items = (itemsRaw ?? []) as Array<{
    id: string; description: string; quantity: number; unit_price: number;
    discount_percent: number; line_total: number;
  }>;

  const customer = customerRaw as {
    id: string; company_name: string; contact_name: string | null;
    address: string | null; city: string | null; tax_number: string | null;
    tax_office: string | null; email: string | null; phone: string | null;
  };

  const validUntilFormatted = quote.valid_until ? formatDate(quote.valid_until) : "30 gün";
  const totalFormatted = formatCurrency(quote.total_amount);

  return (
    <>
      {/* Print CSS */}
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; size: A4; }
          .print-doc { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
        }
      `}</style>

      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header — sadece ekranda görünür */}
        <div className="flex items-center justify-between print-hide">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/musteriler/${id}`}><ArrowLeft className="w-4 h-4" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{quote.quote_number}</h1>
                <Badge variant={STATUS_VARIANT[quote.status] ?? "secondary"}>
                  {STATUS_LABELS[quote.status] ?? quote.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-500">{customer.company_name}</p>
            </div>
          </div>

          {/* Durum aksiyonları */}
          <div className="flex gap-2 flex-wrap justify-end">
            {quote.status === "draft" && (
              <form action={updateQuoteStatus.bind(null, quoteId, "sent", id)}>
                <Button type="submit" size="sm" variant="outline">
                  <Send className="w-4 h-4" /> Gönderildi İşaretle
                </Button>
              </form>
            )}
            {(quote.status === "draft" || quote.status === "sent") && (
              <form action={updateQuoteStatus.bind(null, quoteId, "accepted", id)}>
                <Button type="submit" size="sm" className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-4 h-4" /> Kabul Edildi
                </Button>
              </form>
            )}
            {(quote.status === "draft" || quote.status === "sent") && (
              <form action={updateQuoteStatus.bind(null, quoteId, "rejected", id)}>
                <Button type="submit" size="sm" variant="destructive">
                  <XCircle className="w-4 h-4" /> Reddedildi
                </Button>
              </form>
            )}
            <form action={deleteQuote.bind(null, quoteId, id)}>
              <Button type="submit" size="sm" variant="ghost" className="text-red-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Paylaş / Gönder butonları */}
        <div className="print-hide">
          <QuoteShareButtons
            quoteNumber={quote.quote_number}
            totalAmount={totalFormatted}
            validUntil={validUntilFormatted}
            customerName={customer.company_name}
            customerEmail={customer.email}
            customerPhone={customer.phone}
          />
        </div>

        {/* Teklif belgesi */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden print-doc">

          {/* Belge başlığı — Bio Verim bilgileri */}
          <div className="bg-green-600 text-white px-8 py-6">
            <div className="flex justify-between items-start gap-4">
              {/* Sol: Şirket bilgileri */}
              <div>
                <h2 className="text-2xl font-bold tracking-wide">TEKLİF</h2>
                <p className="text-green-100 text-xs mt-0.5 mb-3">{COMPANY.tagline}</p>
                <p className="font-semibold text-base">{COMPANY.name}</p>
                <p className="text-green-100 text-xs mt-1">{COMPANY.address}</p>
                <p className="text-green-100 text-xs">{COMPANY.city}</p>
                <div className="flex flex-col gap-0.5 mt-2">
                  <p className="text-green-100 text-xs flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {COMPANY.phone}
                  </p>
                  <p className="text-green-100 text-xs flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {COMPANY.email}
                  </p>
                  <p className="text-green-100 text-xs flex items-center gap-1">
                    <Globe className="w-3 h-3" /> {COMPANY.website}
                  </p>
                </div>
                <p className="text-green-200 text-xs mt-2">
                  VKN: {COMPANY.taxNumber} — {COMPANY.taxOffice}
                </p>
              </div>

              {/* Sağ: Teklif no & tarih */}
              <div className="text-right text-sm shrink-0">
                <p className="font-bold text-xl">{quote.quote_number}</p>
                <p className="text-green-100 text-xs mt-1">Tarih: {formatDate(quote.created_at)}</p>
                {quote.valid_until && (
                  <p className="text-green-100 text-xs flex items-center gap-1 justify-end mt-1">
                    <Clock className="w-3 h-3" /> Geçerlilik: {formatDate(quote.valid_until)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Müşteri bilgileri */}
          <div className="px-8 py-5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">Teklif Verilen Firma</p>
            <p className="font-semibold text-slate-800">{customer.company_name}</p>
            {customer.contact_name && <p className="text-sm text-slate-600">{customer.contact_name}</p>}
            {customer.city && <p className="text-sm text-slate-500">{customer.city}</p>}
            {customer.address && <p className="text-sm text-slate-500">{customer.address}</p>}
            {customer.email && <p className="text-xs text-slate-400 mt-1">{customer.email}</p>}
            {customer.phone && <p className="text-xs text-slate-400">{customer.phone}</p>}
            {customer.tax_number && (
              <p className="text-xs text-slate-400 mt-1">
                VKN: {customer.tax_number}{customer.tax_office ? ` — ${customer.tax_office}` : ""}
              </p>
            )}
          </div>

          {/* Ürünler tablosu */}
          <div className="px-8 py-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-2 text-xs text-slate-500 font-medium">ÜRÜN / AÇIKLAMA</th>
                  <th className="text-center py-2 text-xs text-slate-500 font-medium w-20">MİKTAR</th>
                  <th className="text-right py-2 text-xs text-slate-500 font-medium w-28">BİRİM FİYAT</th>
                  <th className="text-center py-2 text-xs text-slate-500 font-medium w-20">İNDİRİM</th>
                  <th className="text-right py-2 text-xs text-slate-500 font-medium w-28">TUTAR</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? "" : "bg-slate-50"}>
                    <td className="py-3 text-slate-800 font-medium">{item.description}</td>
                    <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-600">
                      ₺{item.unit_price.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-center text-slate-500">
                      {item.discount_percent > 0 ? `%${item.discount_percent}` : "—"}
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-800">
                      ₺{item.line_total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Toplamlar */}
          <div className="px-8 py-5 border-t border-slate-100">
            <div className="max-w-xs ml-auto space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ara Toplam</span>
                <span>{formatCurrency(quote.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">KDV (%{quote.tax_rate})</span>
                <span>{formatCurrency(quote.tax_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2">
                <span className="text-slate-800">GENEL TOPLAM</span>
                <span className="text-green-700">{formatCurrency(quote.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notlar */}
          {quote.notes && (
            <div className="px-8 py-5 border-t border-slate-100 bg-amber-50">
              <p className="text-xs text-slate-500 font-medium mb-1">NOTLAR</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}

          {/* Alt bilgi */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>
                Bu teklif {quote.valid_until ? formatDate(quote.valid_until) + " tarihine" : "30 gün"} kadar geçerlidir.
              </span>
              <span>{COMPANY.phone} · {COMPANY.email}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
