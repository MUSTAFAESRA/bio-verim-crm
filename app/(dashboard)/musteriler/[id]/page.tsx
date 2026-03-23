import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Building2,
  Pencil,
  MessageSquare,
  Receipt,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDate,
  formatCurrency,
  SEGMENT_LABELS,
  CONTACT_TYPE_LABELS,
  OUTCOME_LABELS,
  INVOICE_STATUS_LABELS,
  SOURCE_LABELS,
} from "@/lib/utils";
import type { Customer, ContactLog, Invoice, CustomerBalance } from "@/lib/db-types";

const SEGMENT_VARIANTS: Record<string, "warning" | "success" | "muted"> = {
  lead: "warning",
  active: "success",
  passive: "muted",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MusteriDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customerRaw }, { data: contactsRaw }, { data: invoicesRaw }, { data: balanceRaw }] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", id).single(),
      supabase
        .from("contact_logs")
        .select("*")
        .eq("customer_id", id)
        .order("contacted_at", { ascending: false })
        .limit(10),
      supabase
        .from("invoices")
        .select("*")
        .eq("customer_id", id)
        .eq("invoice_type", "sale")
        .order("invoice_date", { ascending: false })
        .limit(10),
      supabase.from("customer_balance").select("*").eq("id", id).single(),
    ]);
  const customer = customerRaw as unknown as Customer | null;
  const contacts = contactsRaw as unknown as ContactLog[] | null;
  const invoices = invoicesRaw as unknown as Invoice[] | null;
  const balance = balanceRaw as unknown as CustomerBalance | null;

  if (!customer) notFound();

  const seg = SEGMENT_LABELS[customer.segment] || customer.segment;
  const segVariant = SEGMENT_VARIANTS[customer.segment] || "muted";

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/musteriler">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{customer.company_name}</h1>
              <Badge variant={segVariant}>{seg}</Badge>
            </div>
            {customer.contact_name && (
              <p className="text-sm text-slate-500 mt-0.5">{customer.contact_name}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/musteriler/${id}/duzenle`}>
              <Pencil className="w-4 h-4" />
              Düzenle
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/iletisim/yeni?customer_id=${id}`}>
              <Plus className="w-4 h-4" />
              Temas Ekle
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Customer Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">İletişim Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`tel:${customer.phone}`} className="text-green-600 hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-green-600 hover:underline truncate">
                    {customer.email}
                  </a>
                </div>
              )}
              {(customer.city || customer.district) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">
                    {[customer.district, customer.city].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
              {customer.address && (
                <p className="text-sm text-slate-500 pl-6">{customer.address}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vergi Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {customer.tax_number && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-600">{customer.tax_number}</span>
                </div>
              )}
              {customer.tax_office && (
                <p className="text-sm text-slate-500 pl-6">{customer.tax_office}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Finansal Özet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Toplam Fatura</span>
                <span className="font-semibold">{formatCurrency(balance?.total_invoiced)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ödenen</span>
                <span className="font-semibold text-green-600">{formatCurrency(balance?.total_paid)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                <span className="text-slate-700 font-medium">Bakiye</span>
                <span className={`font-bold ${(balance?.balance_due ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(balance?.balance_due)}
                </span>
              </div>
            </CardContent>
          </Card>

          {customer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notlar</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{customer.notes}</p>
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-slate-400 space-y-1 px-1">
            <p>Kaynak: {SOURCE_LABELS[customer.source || "manual"] || customer.source}</p>
            <p>Eklenme: {formatDate(customer.created_at)}</p>
            <p>Güncelleme: {formatDate(customer.updated_at)}</p>
          </div>
        </div>

        {/* Right: Activity */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  İletişim Geçmişi ({contacts?.length ?? 0})
                </CardTitle>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link href={`/iletisim/yeni?customer_id=${id}`}>
                    <Plus className="w-3 h-3" /> Temas Ekle
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {contacts && contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts.map((log) => (
                    <div key={log.id} className="flex gap-3 p-3 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-sm">
                        {log.contact_type === "call" ? "📞" :
                         log.contact_type === "visit" ? "🤝" :
                         log.contact_type === "email" ? "📧" :
                         log.contact_type === "whatsapp" ? "💬" : "📋"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-slate-700">
                            {CONTACT_TYPE_LABELS[log.contact_type] || log.contact_type}
                          </span>
                          {log.outcome && (
                            <Badge variant="secondary" className="text-xs">
                              {OUTCOME_LABELS[log.outcome] || log.outcome}
                            </Badge>
                          )}
                        </div>
                        {log.subject && <p className="text-sm text-slate-600 mt-0.5">{log.subject}</p>}
                        {log.notes && <p className="text-xs text-slate-400 mt-1">{log.notes}</p>}
                        {log.next_action_date && (
                          <p className="text-xs text-amber-600 mt-1">
                            Sonraki aksiyon: {formatDate(log.next_action_date)} — {log.next_action}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{formatDate(log.contacted_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">
                  Henüz iletişim kaydı bulunmuyor
                </p>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-green-500" />
                  Faturalar ({invoices?.length ?? 0})
                </CardTitle>
                <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                  <Link href={`/finans/faturalar/yeni?customer_id=${id}`}>
                    <Plus className="w-3 h-3" /> Fatura Oluştur
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invoices && invoices.length > 0 ? (
                <div className="space-y-2">
                  {invoices.map((inv) => (
                    <Link
                      key={inv.id}
                      href={`/finans/faturalar/${inv.id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-sm"
                    >
                      <div>
                        <span className="font-medium text-slate-700">{inv.invoice_number}</span>
                        <span className="text-slate-400 text-xs ml-2">{formatDate(inv.invoice_date)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            inv.status === "paid" ? "success" :
                            inv.status === "overdue" ? "destructive" :
                            inv.status === "partially_paid" ? "warning" : "secondary"
                          }
                          className="text-xs"
                        >
                          {INVOICE_STATUS_LABELS[inv.status] || inv.status}
                        </Badge>
                        <span className="font-semibold">{formatCurrency(inv.total_amount)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-6">
                  Henüz fatura bulunmuyor
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
