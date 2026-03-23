import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Invoice } from "@/lib/db-types";

type InvoiceWithParty = Invoice & {
  customers: { company_name: string } | null;
  suppliers: { company_name: string } | null;
};

interface PageProps {
  searchParams: Promise<{ type?: string; status?: string }>;
}

export default async function FaturalarPage({ searchParams }: PageProps) {
  const { type, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("invoices")
    .select("*, customers(company_name), suppliers(company_name)")
    .order("created_at", { ascending: false });

  if (type && type !== "all") query = query.eq("invoice_type", type as "sale" | "purchase");
  if (status && status !== "all") query = query.eq("status", status as Invoice["status"]);

  const { data: invoicesRaw } = await query.limit(200);
  const invoices = invoicesRaw as unknown as InvoiceWithParty[] | null;

  const filterTabs = [
    { key: "all", label: "Tümü" },
    { key: "sale", label: "Satış" },
    { key: "purchase", label: "Alış" },
  ];

  const statusTabs = [
    { key: "all", label: "Tüm Durumlar" },
    { key: "draft", label: "Taslak" },
    { key: "sent", label: "Gönderildi" },
    { key: "partially_paid", label: "Kısmi Ödeme" },
    { key: "paid", label: "Ödendi" },
    { key: "overdue", label: "Gecikmiş" },
  ];

  const currentType = type || "all";
  const currentStatus = status || "all";

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Faturalar</h1>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/api/export/invoices" download>
              <Download className="w-4 h-4" />
              CSV
            </a>
          </Button>
          <Button asChild size="sm">
            <Link href="/finans/faturalar/yeni">
              <Plus className="w-4 h-4" />
              Yeni Fatura
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {filterTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/finans/faturalar?type=${tab.key}${currentStatus !== "all" ? `&status=${currentStatus}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentType === tab.key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {statusTabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/finans/faturalar?${currentType !== "all" ? `type=${currentType}&` : ""}status=${tab.key}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                currentStatus === tab.key ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Fatura No</TableHead>
              <TableHead>Tip</TableHead>
              <TableHead>Müşteri/Tedarikçi</TableHead>
              <TableHead>Fatura Tarihi</TableHead>
              <TableHead>Vade</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">KDV Dahil Tutar</TableHead>
              <TableHead className="text-right">Ödenen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices && invoices.length > 0 ? (
              invoices.map((inv) => {
                const party = inv.invoice_type === "sale"
                  ? (inv.customers as { company_name: string } | null)?.company_name
                  : (inv.suppliers as { company_name: string } | null)?.company_name;
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <Link href={`/finans/faturalar/${inv.id}`} className="font-medium text-green-700 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.invoice_type === "sale" ? "success" : "info"} className="text-xs">
                        {inv.invoice_type === "sale" ? "Satış" : "Alış"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{party || "-"}</TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDate(inv.invoice_date)}</TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDate(inv.due_date)}</TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(inv.total_amount)}</TableCell>
                    <TableCell className="text-right text-green-600 font-medium">{formatCurrency(inv.paid_amount)}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                  Fatura bulunamadı.{" "}
                  <Link href="/finans/faturalar/yeni" className="text-green-600 hover:underline">
                    İlk faturayı oluşturun
                  </Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
