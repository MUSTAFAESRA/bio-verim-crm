import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/db-types";
import { CustomerGrid } from "@/components/musteriler/customer-grid";

const SEGMENT_TABS = {
  lead: { label: "Aday" },
  active: { label: "Aktif" },
  passive: { label: "Pasif" },
};

interface PageProps {
  searchParams: Promise<{ segment?: string; q?: string }>;
}

export default async function MusterilerPage({ searchParams }: PageProps) {
  const { segment, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  if (segment && segment !== "all") {
    query = query.eq("segment", segment as Customer["segment"]);
  }

  if (q) {
    query = query.or(`company_name.ilike.%${q}%,contact_name.ilike.%${q}%,phone.ilike.%${q}%,city.ilike.%${q}%`);
  }

  const { data: customersRaw } = await query.limit(100);
  const customers = customersRaw as unknown as Customer[] | null;

  const counts = await Promise.all([
    supabase.from("customers").select("*", { count: "exact", head: true }),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("segment", "lead"),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("segment", "active"),
    supabase.from("customers").select("*", { count: "exact", head: true }).eq("segment", "passive"),
  ]);

  const [total, leads, active, passive] = counts.map((c) => c.count ?? 0);

  const tabs = [
    { key: "all", label: "Tümü", count: total },
    { key: "lead", label: "Aday", count: leads },
    { key: "active", label: "Aktif", count: active },
    { key: "passive", label: "Pasif", count: passive },
  ];

  const currentTab = segment || "all";

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Müşteriler</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/api/export/customers" download>
              <Download className="w-4 h-4" />
              CSV
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/musteriler/yeni">
              <Plus className="w-4 h-4" />
              Yeni Müşteri
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/musteriler${tab.key === "all" ? "" : `?segment=${tab.key}`}${q ? `${tab.key === "all" ? "?" : "&"}q=${q}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
              currentTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
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
      <form method="GET" action="/musteriler" className="flex gap-2 max-w-md">
        {segment && <input type="hidden" name="segment" value={segment} />}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            placeholder="İsim, telefon veya şehir ara..."
            className="w-full pl-9 pr-3 h-9 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">Ara</Button>
      </form>

      {/* Customer Grid with Bulk Selection */}
      <CustomerGrid customers={(customers ?? []) as any} />
    </div>
  );
}
