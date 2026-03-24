import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, MapPin, Phone, Search, UserPlus, Globe, Linkedin, Instagram, Facebook, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, LEAD_STATUS_LABELS, SOURCE_LABELS } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "muted" | "destructive"> = {
  new: "info",
  contacted: "warning",
  qualified: "success",
  converted: "muted",
  rejected: "destructive",
};

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string }>;
}

export default async function MusteriAdayiPage({ searchParams }: PageProps) {
  const { status, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") query = query.eq("status", status);
  if (q) query = query.or(`business_name.ilike.%${q}%,contact_name.ilike.%${q}%,city.ilike.%${q}%`);

  const { data: leads } = await query.limit(100);

  const counts = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "contacted"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "qualified"),
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("status", "converted"),
  ]);

  const [total, newLeads, contacted, qualified, converted] = counts.map((c) => c.count ?? 0);

  const tabs = [
    { key: "all", label: "Tümü", count: total },
    { key: "new", label: "Yeni", count: newLeads },
    { key: "contacted", label: "İletişime Geçildi", count: contacted },
    { key: "qualified", label: "Nitelikli", count: qualified },
    { key: "converted", label: "Dönüştürüldü", count: converted },
  ];

  const currentTab = status || "all";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Müşteri Adayı Bul</h1>
          <p className="text-sm text-slate-500 mt-0.5">Google, LinkedIn, Facebook ve manuel aday yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm">
            <Link href="/musteri-adayi/yeni">
              <Plus className="w-4 h-4" />
              Manuel Aday Ekle
            </Link>
          </Button>
        </div>
      </div>

      {/* Platform Cards — Arama Araçları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/musteri-adayi/bul" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all group">
          <div className="text-2xl mb-2">🗺️</div>
          <p className="text-sm font-semibold text-slate-800 group-hover:text-green-600">Google Maps</p>
          <p className="text-xs text-slate-500 mt-0.5">İl bazında bayi ara</p>
        </Link>
        <Link href="/musteri-adayi/linkedin" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition-all group">
          <Linkedin className="w-6 h-6 text-blue-600 mb-2" />
          <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">LinkedIn</p>
          <p className="text-xs text-slate-500 mt-0.5">Şirket ve profesyonel ara</p>
        </Link>
        <Link href="/musteri-adayi/instagram" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-pink-400 hover:shadow-sm transition-all group">
          <Instagram className="w-6 h-6 text-pink-500 mb-2" />
          <p className="text-sm font-semibold text-slate-800 group-hover:text-pink-500">Instagram</p>
          <p className="text-xs text-slate-500 mt-0.5">Hashtag ile tara</p>
        </Link>
        <Link href="/musteri-adayi/facebook" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition-all group">
          <Facebook className="w-6 h-6 text-blue-500 mb-2" />
          <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-500">Facebook Grup</p>
          <p className="text-xs text-slate-500 mt-0.5">Grup üyelerini tara</p>
        </Link>
      </div>

      {/* KOL + Source Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link href="/musteri-adayi/kol-takip" className="bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-400 hover:shadow-sm transition-all group col-span-1">
          <Star className="w-5 h-5 text-amber-500 mb-1" />
          <p className="text-xs text-slate-500">KOL / Önemli Kişi</p>
          <p className="text-lg font-bold text-slate-800">Takip</p>
        </Link>
        {[
          { label: "Google Places", icon: "🗺️", source: "google_places" },
          { label: "LinkedIn", icon: "💼", source: "linkedin" },
          { label: "Facebook", icon: "📘", source: "facebook_lead" },
          { label: "Manuel", icon: "✏️", source: "manual" },
        ].map(async (src) => {
          const { count } = await supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .eq("source", src.source);
          return (
            <div key={src.source} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{src.icon}</div>
              <p className="text-xs text-slate-500">{src.label}</p>
              <p className="text-xl font-bold text-slate-800">{count ?? 0}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/musteri-adayi${tab.key === "all" ? "" : `?status=${tab.key}`}${q ? `${tab.key === "all" ? "?" : "&"}q=${q}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === tab.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              currentTab === tab.key ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <form method="GET" action="/musteri-adayi" className="flex gap-2 max-w-md">
        {status && <input type="hidden" name="status" value={status} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="İsim, şehir ara..."
            className="w-full pl-9 pr-3 h-9 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">Ara</Button>
      </form>

      {/* Leads Grid */}
      {leads && leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {leads.map((lead) => {
            const sv = STATUS_VARIANT[lead.status] || "secondary";
            return (
              <div key={lead.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-800 truncate">{lead.business_name}</h3>
                    {lead.contact_name && (
                      <p className="text-sm text-slate-500">{lead.contact_name}</p>
                    )}
                  </div>
                  <Badge variant={sv} className="ml-2 flex-shrink-0 text-xs">
                    {LEAD_STATUS_LABELS[lead.status] || lead.status}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${lead.phone}`} className="hover:text-green-600">{lead.phone}</a>
                    </div>
                  )}
                  {lead.city && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{lead.city}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">
                      {SOURCE_LABELS[lead.source || "manual"] || lead.source}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{formatDate(lead.created_at)}</span>
                  </div>
                  {lead.status !== "converted" && lead.status !== "rejected" && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                      <Link href={`/musteri-adayi/${lead.id}`}>
                        <UserPlus className="w-3 h-3" />
                        Dönüştür
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aday bulunamadı</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button asChild size="sm" variant="outline">
              <Link href="/musteri-adayi/bul">Google ile Ara</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/musteri-adayi/yeni">Manuel Ekle</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
