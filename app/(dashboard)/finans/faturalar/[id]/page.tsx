import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, INVOICE_STATUS_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import { addPayment } from "@/actions/invoices";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FaturaDetayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: items }, { data: payments }, { data: plans }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(company_name, phone, email), suppliers(company_name)")
      .eq("id", id)
      .single(),
    supabase.from("invoice_items").select("*, products(name, unit)").eq("invoice_id", id),
    supabase.from("bv_payments").select("*").eq("invoice_id", id).order("payment_date", { ascending: false }),
    supabase.from("payment_plans").select("*").eq("invoice_id", id).order("installment_no"),
  ]);

  if (!invoice) notFound();

  const party = invoice.invoice_type === "sale"
    ? (invoice.customers as { company_name: string } | null)?.company_name
    : (invoice.suppliers as { company_name: string } | null)?.company_name;

  const remaining = (invoice.total_amount || 0) - (invoice.paid_amount || 0);

  const action = addPayment.bind(null);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/finans/faturalar">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{invoice.invoice_number}</h1>
              <Badge variant={invoice.invoice_type === "sale" ? "success" : "info"} className="text-xs">
                {invoice.invoice_type === "sale" ? "Satış Faturası" : "Alış Faturası"}
              </Badge>
              <Badge
                variant={
                  invoice.status === "paid" ? "success" :
                  invoice.status === "overdue" ? "destructive" :
                  invoice.status === "partially_paid" ? "warning" : "secondary"
                }
                className="text-xs"
              >
                {INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{party || "-"}</p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/invoices/${id}/pdf`} target="_blank">
            <Printer className="w-4 h-4" />
            Yazdır / PDF
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Fatura Tarihi</p>
                  <p className="font-medium">{formatDate(invoice.invoice_date)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Vade Tarihi</p>
                  <p className="font-medium">{formatDate(invoice.due_date)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">KDV Oranı</p>
                  <p className="font-medium">%{invoice.tax_rate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Fatura Kalemleri</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="pl-6">Açıklama</TableHead>
                    <TableHead className="text-center">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right pr-6">Toplam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-6 text-sm">{item.description}</TableCell>
                      <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right pr-6 font-medium">{formatCurrency(item.line_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t bg-slate-50 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Ara Toplam</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">KDV (%{invoice.tax_rate})</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1.5">
                  <span>Genel Toplam</span>
                  <span className="text-green-700">{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Plan */}
          {plans && plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ödeme Planı</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="pl-6">Taksit</TableHead>
                      <TableHead>Vade</TableHead>
                      <TableHead className="text-right pr-6">Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="pl-6 text-sm">{plan.installment_no}. Taksit</TableCell>
                        <TableCell className="text-sm">{formatDate(plan.due_date)}</TableCell>
                        <TableCell className="text-right pr-6 font-medium">{formatCurrency(plan.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={plan.is_paid ? "success" : "secondary"} className="text-xs">
                            {plan.is_paid ? "Ödendi" : "Bekliyor"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Payments */}
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Toplam Tutar</span>
                <span className="font-semibold">{formatCurrency(invoice.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Ödenen</span>
                <span className="font-semibold text-green-600">{formatCurrency(invoice.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="font-medium text-slate-700">Kalan</span>
                <span className={`font-bold text-lg ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Add Payment */}
          {remaining > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Ödeme Ekle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form action={action} className="space-y-3">
                  <input type="hidden" name="invoice_id" value={id} />
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tutar (₺)</Label>
                    <Input name="amount" type="number" step="0.01" min="0.01" max={remaining} defaultValue={remaining} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ödeme Tarihi</Label>
                    <Input name="payment_date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ödeme Yöntemi</Label>
                    <select name="payment_method" className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                      <option value="bank_transfer">Havale/EFT</option>
                      <option value="cash">Nakit</option>
                      <option value="check">Çek</option>
                      <option value="credit_card">Kredi Kartı</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Referans No</Label>
                    <Input name="reference_no" placeholder="Dekont/Çek No" />
                  </div>
                  <Button type="submit" className="w-full" size="sm">Ödeme Kaydet</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ödeme Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {payments && payments.length > 0 ? (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm p-2 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-700">{formatDate(p.payment_date)}</p>
                        <p className="text-xs text-slate-400">
                          {PAYMENT_METHOD_LABELS[p.payment_method || ""] || p.payment_method}
                          {p.reference_no ? ` · ${p.reference_no}` : ""}
                        </p>
                      </div>
                      <span className="font-semibold text-green-600">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">Ödeme kaydı yok</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
