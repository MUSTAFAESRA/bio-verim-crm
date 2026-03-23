import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime, CONTACT_TYPE_LABELS, OUTCOME_LABELS } from "@/lib/utils";
import { markReminderDone } from "@/actions/contact-logs";

export default async function IletisimPage() {
  const supabase = await createClient();

  const [{ data: logs }, { data: reminders }] = await Promise.all([
    supabase
      .from("contact_logs")
      .select("*, customers(company_name)")
      .order("contacted_at", { ascending: false })
      .limit(50),
    supabase
      .from("reminders")
      .select("*, customers(company_name)")
      .eq("is_completed", false)
      .order("remind_at", { ascending: true })
      .limit(20),
  ]);

  const overdueReminders = reminders?.filter((r) => new Date(r.remind_at) <= new Date()) ?? [];
  const upcomingReminders = reminders?.filter((r) => new Date(r.remind_at) > new Date()) ?? [];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">İletişim Yönetimi</h1>
        <Button asChild size="sm">
          <Link href="/iletisim/yeni">
            <Plus className="w-4 h-4" />
            Temas Ekle
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Contact Logs */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-slate-600">Son Temas Kayıtları</h2>
          {logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 text-lg">
                    {log.contact_type === "call" ? "📞" :
                     log.contact_type === "visit" ? "🤝" :
                     log.contact_type === "email" ? "📧" :
                     log.contact_type === "whatsapp" ? "💬" :
                     log.contact_type === "meeting" ? "👥" : "📋"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700 text-sm">
                          {CONTACT_TYPE_LABELS[log.contact_type] || log.contact_type}
                        </span>
                        <span className="text-slate-400 text-xs">·</span>
                        <Link
                          href={`/musteriler/${log.customer_id}`}
                          className="text-sm text-green-600 hover:underline truncate"
                        >
                          {(log.customers as { company_name: string } | null)?.company_name || "Bilinmeyen"}
                        </Link>
                      </div>
                      {log.outcome && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {OUTCOME_LABELS[log.outcome] || log.outcome}
                        </Badge>
                      )}
                    </div>
                    {log.subject && (
                      <p className="text-sm text-slate-600 mt-0.5">{log.subject}</p>
                    )}
                    {log.notes && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{log.notes}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-slate-400">{formatDateTime(log.contacted_at)}</span>
                      {log.next_action_date && (
                        <span className="text-xs text-amber-600">
                          Sonraki: {formatDate(log.next_action_date)} — {log.next_action}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 text-center py-12">
              <p className="text-slate-400">Henüz temas kaydı yok</p>
              <Button asChild size="sm" className="mt-4">
                <Link href="/iletisim/yeni">İlk Teması Ekle</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Reminders */}
        <div className="space-y-4">
          {/* Overdue */}
          {overdueReminders.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-red-600">
                  <Bell className="w-4 h-4" />
                  Gecikmiş ({overdueReminders.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {overdueReminders.map((r) => (
                  <div key={r.id} className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-700">{r.title}</p>
                    <p className="text-xs text-red-400 mt-0.5">
                      {(r.customers as { company_name: string } | null)?.company_name}
                    </p>
                    <p className="text-xs text-red-400">{formatDateTime(r.remind_at)}</p>
                    <form action={async () => { "use server"; await markReminderDone(r.id); }}>
                      <Button type="submit" size="sm" variant="outline" className="mt-2 h-6 text-xs border-red-300 text-red-600">
                        Tamamlandı
                      </Button>
                    </form>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                Yaklaşan Hatırlatıcılar ({upcomingReminders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReminders.length > 0 ? (
                <div className="space-y-2">
                  {upcomingReminders.map((r) => (
                    <div key={r.id} className="p-3 bg-amber-50 rounded-lg">
                      <p className="text-sm font-medium text-amber-700">{r.title}</p>
                      <p className="text-xs text-amber-500">
                        {(r.customers as { company_name: string } | null)?.company_name}
                      </p>
                      <p className="text-xs text-amber-500">{formatDateTime(r.remind_at)}</p>
                      <form action={async () => { "use server"; await markReminderDone(r.id); }}>
                        <Button type="submit" size="sm" variant="outline" className="mt-2 h-6 text-xs border-amber-300 text-amber-600">
                          Tamamlandı
                        </Button>
                      </form>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Yaklaşan hatırlatıcı yok</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
