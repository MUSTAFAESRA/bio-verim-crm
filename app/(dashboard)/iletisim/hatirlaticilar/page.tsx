import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Bell, CheckCircle2, Clock, AlertTriangle, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatDate } from "@/lib/utils";
import { markReminderDone, createReminder } from "@/actions/contact-logs";

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function HatirlaticilarPage({ searchParams }: PageProps) {
  const { filter } = await searchParams;
  const supabase = await createClient();

  const now = new Date().toISOString();

  // Parallel queries
  const [
    { data: allReminders },
    { count: totalCount },
    { count: overdueCount },
    { count: todayCount },
    { count: completedCount },
  ] = await Promise.all([
    (() => {
      let query = supabase
        .from("reminders")
        .select("*, customers(id, company_name)")
        .order("remind_at", { ascending: true })
        .limit(100);

      if (filter === "overdue") {
        query = query.eq("is_completed", false).lt("remind_at", now);
      } else if (filter === "today") {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        query = query
          .eq("is_completed", false)
          .gte("remind_at", todayStart.toISOString())
          .lte("remind_at", todayEnd.toISOString());
      } else if (filter === "completed") {
        query = query.eq("is_completed", true).order("completed_at", { ascending: false });
      } else {
        // Default: pending
        query = query.eq("is_completed", false);
      }

      return query;
    })(),
    supabase.from("reminders").select("*", { count: "exact", head: true }).eq("is_completed", false),
    supabase.from("reminders").select("*", { count: "exact", head: true }).eq("is_completed", false).lt("remind_at", now),
    (() => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      return supabase
        .from("reminders")
        .select("*", { count: "exact", head: true })
        .eq("is_completed", false)
        .gte("remind_at", todayStart.toISOString())
        .lte("remind_at", todayEnd.toISOString());
    })(),
    supabase.from("reminders").select("*", { count: "exact", head: true }).eq("is_completed", true),
  ]);

  const reminders = allReminders as unknown as Array<{
    id: string;
    title: string;
    notes: string | null;
    remind_at: string;
    is_completed: boolean;
    completed_at: string | null;
    customer_id: string | null;
    customers: { id: string; company_name: string } | null;
  }> | null;

  const tabs = [
    { key: "pending", label: "Bekleyen", count: totalCount ?? 0, icon: Clock },
    { key: "overdue", label: "Gecikmiş", count: overdueCount ?? 0, icon: AlertTriangle },
    { key: "today", label: "Bugün", count: todayCount ?? 0, icon: Bell },
    { key: "completed", label: "Tamamlanan", count: completedCount ?? 0, icon: CheckCircle2 },
  ];

  const currentTab = filter || "pending";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/iletisim">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Hatırlatıcılar</h1>
            <p className="text-sm text-slate-500">Tüm hatırlatıcıları yönetin</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/iletisim/hatirlaticilar${tab.key === "pending" ? "" : `?filter=${tab.key}`}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              currentTab === tab.key ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* New Reminder Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Hızlı Hatırlatıcı Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createReminder} className="flex flex-wrap gap-3">
            <input
              name="title"
              placeholder="Hatırlatıcı başlığı..."
              required
              className="flex-1 min-w-[200px] h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <input
              name="remind_at"
              type="datetime-local"
              required
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <input
              name="notes"
              placeholder="Not (opsiyonel)"
              className="w-48 h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <Button type="submit" size="sm">
              <Plus className="w-4 h-4" />
              Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Reminder List */}
      {reminders && reminders.length > 0 ? (
        <div className="space-y-3">
          {reminders.map((r) => {
            const isOverdue = !r.is_completed && new Date(r.remind_at) < new Date();
            return (
              <div
                key={r.id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${
                  r.is_completed
                    ? "border-slate-200 opacity-60"
                    : isOverdue
                    ? "border-red-200 bg-red-50/50"
                    : "border-slate-200"
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  r.is_completed
                    ? "bg-green-100"
                    : isOverdue
                    ? "bg-red-100"
                    : "bg-amber-100"
                }`}>
                  {r.is_completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : isOverdue ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${r.is_completed ? "line-through text-slate-400" : "text-slate-700"}`}>
                      {r.title}
                    </p>
                    {isOverdue && <Badge variant="destructive" className="text-xs">Gecikmiş</Badge>}
                  </div>
                  {r.customers && (
                    <Link
                      href={`/musteriler/${r.customers.id}`}
                      className="text-xs text-green-600 hover:underline"
                    >
                      {r.customers.company_name}
                    </Link>
                  )}
                  {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {r.is_completed
                      ? `Tamamlandı: ${formatDateTime(r.completed_at)}`
                      : `Hatırlatma: ${formatDateTime(r.remind_at)}`}
                  </p>
                </div>
                {!r.is_completed && (
                  <form action={markReminderDone.bind(null, r.id)}>
                    <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tamamla
                    </Button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Hatırlatıcı bulunamadı</p>
          <p className="text-slate-400 text-sm mt-1">
            {currentTab === "overdue"
              ? "Gecikmiş hatırlatıcı yok"
              : currentTab === "completed"
              ? "Henüz tamamlanan hatırlatıcı yok"
              : "Yeni bir hatırlatıcı ekleyebilirsiniz"}
          </p>
        </div>
      )}
    </div>
  );
}
