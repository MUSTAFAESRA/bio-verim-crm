import { createClient } from "@/lib/supabase/server";
import {
  Users,
  AlertTriangle,
  TrendingUp,
  Package,
  Bell,
  Plus,
  ArrowRight,
  Receipt,
  MessageCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, SEGMENT_LABELS, CONTACT_TYPE_LABELS } from "@/lib/utils";
import Link from "next/link";
import type { LowStockProduct } from "@/lib/db-types";
import { DailyBriefingWidget } from "@/components/dashboard/daily-briefing-widget";

type OverdueInvoice = { id: string; invoice_number: string; customer_id: string | null; total_amount: number; due_date: string };
type TodayReminder = { id: string; title: string; remind_at: string; customer_id: string | null };
type RecentContact = { id: string; customer_id: string; contact_type: string; contacted_at: string; outcome: string | null };
type DueWhatsApp = {
  id: string;
  customer_id: string;
  current_step: number;
  next_contact_at: string;
  contact_sequences: { name: string; steps: Array<{ step_no: number; channel: string; message_template: string }> } | null;
  customers: { company_name: string; phone: string | null } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Parallel queries
  const [
    { count: activeCustomers },
    { count: leadCustomers },
    { data: overdueInvoicesRaw },
    { data: lowStockRaw },
    { data: todayRemindersRaw },
    { data: recentContactsRaw },
    { data: monthInvoicesRaw },
    { data: dueSequencesRaw },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("segment", "active"),
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("segment", "lead"),
    supabase
      .from("invoices")
      .select("id, invoice_number, customer_id, total_amount, due_date")
      .eq("status", "overdue")
      .eq("invoice_type", "sale")
      .order("due_date", { ascending: true })
      .limit(5),
    supabase.from("low_stock_products").select("id, name, current_stock, min_stock_level, shortage").limit(5),
    supabase
      .from("reminders")
      .select("id, title, remind_at, customer_id")
      .eq("is_completed", false)
      .lte("remind_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order("remind_at", { ascending: true })
      .limit(5),
    supabase
      .from("contact_logs")
      .select("id, customer_id, contact_type, contacted_at, outcome")
      .order("contacted_at", { ascending: false })
      .limit(5),
    supabase
      .from("invoices")
      .select("total_amount")
      .eq("invoice_type", "sale")
      .gte("invoice_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0])
      .neq("status", "cancelled"),
    supabase
      .from("customer_sequences")
      .select("id, customer_id, current_step, next_contact_at, contact_sequences(name, steps), customers(company_name, phone)")
      .eq("status", "active")
      .lte("next_contact_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .order("next_contact_at", { ascending: true })
      .limit(10),
  ]);
  const overdueInvoices = overdueInvoicesRaw as unknown as OverdueInvoice[] | null;
  const lowStock = lowStockRaw as unknown as LowStockProduct[] | null;
  const todayReminders = todayRemindersRaw as unknown as TodayReminder[] | null;
  const recentContacts = recentContactsRaw as unknown as RecentContact[] | null;
  const monthInvoices = monthInvoicesRaw as unknown as { total_amount: number | null }[] | null;

  const monthRevenue = monthInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) ?? 0;
  const overdueTotal = overdueInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) ?? 0;

  // Bugün gönderilecek adımları kanala göre ayır
  const dueSequences = dueSequencesRaw as unknown as DueWhatsApp[] | null;
  const dueWhatsApp = (dueSequences ?? []).filter(cs => {
    const stepData = cs.contact_sequences?.steps?.find(s => s.step_no === cs.current_step);
    return stepData?.channel === "whatsapp";
  });
  const dueSocial = (dueSequences ?? []).filter(cs => {
    const stepData = cs.contact_sequences?.steps?.find(s => s.step_no === cs.current_step);
    return ["instagram", "linkedin_dm", "facebook_dm"].includes(stepData?.channel ?? "");
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/musteriler/yeni">
              <Plus className="w-4 h-4" />
              Yeni Müşteri
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/finans/faturalar/yeni">
              <Plus className="w-4 h-4" />
              Yeni Fatura
            </Link>
          </Button>
        </div>
      </div>

      {/* AI Günlük Briefing */}
      <DailyBriefingWidget />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Aktif Müşteri</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{activeCustomers ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">{leadCustomers ?? 0} aday müşteri</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Bu Ayki Satış</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(monthRevenue)}</p>
                <p className="text-xs text-slate-400 mt-1">{monthInvoices?.length ?? 0} fatura</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Gecikmiş Alacak</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(overdueTotal)}</p>
                <p className="text-xs text-slate-400 mt-1">{overdueInvoices?.length ?? 0} gecikmiş fatura</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Düşük Stok</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{lowStock?.length ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">ürün kritik seviyede</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Reminders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Bugünkü Hatırlatıcılar
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/iletisim/hatirlaticilar">
                  Tümü <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayReminders && todayReminders.length > 0 ? (
              <ul className="space-y-2">
                {todayReminders.map((r) => (
                  <li key={r.id} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(r.remind_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Bugün hatırlatıcı yok</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Kritik Stok Uyarıları
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/depo">
                  Tümü <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock && lowStock.length > 0 ? (
              <ul className="space-y-2">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-700 truncate">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.current_stock} / min {p.min_stock_level}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      -{p.shortage}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-green-600 text-center py-4">Tüm stoklar yeterli</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Son İletişimler</CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/iletisim">
                  Tümü <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentContacts && recentContacts.length > 0 ? (
              <ul className="space-y-2">
                {recentContacts.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs">📞</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-500">
                        {CONTACT_TYPE_LABELS[c.contact_type] || c.contact_type}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(c.contacted_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Henüz iletişim kaydı yok</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bugün Gönderilecek WhatsApp */}
      {dueWhatsApp.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                Bugün Gönderilecek WhatsApp
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {dueWhatsApp.length}
                </span>
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/iletisim/sekvanslar">
                  Sekvanslar <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dueWhatsApp.map((cs) => {
                const stepData = cs.contact_sequences?.steps?.find(s => s.step_no === cs.current_step);
                const phone = cs.customers?.phone ?? "";
                const customerName = cs.customers?.company_name ?? "Müşteri";
                const message = (stepData?.message_template ?? "")
                  .replace(/\{\{musteri_adi\}\}/g, customerName)
                  .replace(/\{\{urun_adi\}\}/g, "Bio Verim Sıvı Gübre")
                  .replace(/\{\{tarih\}\}/g, new Date().toLocaleDateString("tr-TR"))
                  .replace(/\{\{fiyat\}\}/g, "fiyat için arayın");
                const waPhone = phone.replace(/\D/g, "").replace(/^0/, "90");
                const waLink = phone
                  ? `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
                  : null;

                return (
                  <div key={cs.id} className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm truncate">{customerName}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {cs.contact_sequences?.name} · Adım {cs.current_step}
                      </p>
                      {phone && <p className="text-xs text-green-600">{phone}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Link href={`/iletisim/sekvanslar/${cs.id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                          Detay
                        </Button>
                      </Link>
                      {waLink ? (
                        <a href={waLink} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700 gap-1">
                            <MessageCircle className="w-3 h-3" /> Gönder
                          </Button>
                        </a>
                      ) : (
                        <Button size="sm" disabled className="text-xs h-7 px-2">
                          Tel yok
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bugün Gönderilecek Sosyal Medya */}
      {dueSocial.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <span>📱</span>
                Bugün Gönderilecek Sosyal Medya
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {dueSocial.length}
                </span>
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/iletisim/sekvanslar">
                  Sekvanslar <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dueSocial.map((cs) => {
                const stepData = cs.contact_sequences?.steps?.find(s => s.step_no === cs.current_step);
                const channel = stepData?.channel ?? "";
                const customerName = cs.customers?.company_name ?? "Müşteri";
                const channelIcon = channel === "instagram" ? "📸" : channel === "linkedin_dm" ? "💼" : "📘";
                const channelLabel = channel === "instagram" ? "Instagram DM" : channel === "linkedin_dm" ? "LinkedIn DM" : "Facebook Mesaj";
                const channelColor = channel === "instagram" ? "bg-pink-100 text-pink-700" : channel === "linkedin_dm" ? "bg-blue-100 text-blue-700" : "bg-indigo-100 text-indigo-700";

                return (
                  <div key={cs.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 text-sm truncate">{customerName}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${channelColor}`}>
                          {channelIcon} {channelLabel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {cs.contact_sequences?.name} · Adım {cs.current_step}
                      </p>
                    </div>
                    <Link href={`/iletisim/sekvanslar/${cs.id}`} className="ml-3 flex-shrink-0">
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2">
                        Gönder
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overdue Invoices */}
      {overdueInvoices && overdueInvoices.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Gecikmiş Faturalar
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7">
                <Link href="/finans/faturalar?status=overdue">
                  Tümünü Gör <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg text-sm">
                  <div>
                    <span className="font-medium text-slate-700">{inv.invoice_number}</span>
                    <span className="text-slate-400 text-xs ml-2">Vade: {formatDate(inv.due_date)}</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(inv.total_amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
