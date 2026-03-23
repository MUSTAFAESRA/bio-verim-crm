"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createInvoice } from "@/actions/invoices";

interface Customer {
  id: string;
  company_name: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  unit_price: number | null;
}

interface LineItem {
  id: number;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Supplier {
  id: string;
  company_name: string;
}

interface Props {
  customers: Customer[];
  products: Product[];
  suppliers: Supplier[];
}

export default function YeniFaturaForm({ customers, products, suppliers }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invoiceType, setInvoiceType] = useState<"sale" | "purchase">("sale");
  const [taxRate, setTaxRate] = useState(20);
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, product_id: "", description: "", quantity: 1, unit_price: 0 },
  ]);
  const [installments, setInstallments] = useState(1);

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now(), product_id: "", description: "", quantity: 1, unit_price: 0 },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) => {
    setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  };

  const handleProductSelect = (itemId: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      setItems(
        items.map((i) =>
          i.id === itemId
            ? {
                ...i,
                product_id: productId,
                description: product.name,
                unit_price: product.unit_price ?? 0,
              }
            : i
        )
      );
    } else {
      updateItem(itemId, "product_id", productId);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set(
      "items_json",
      JSON.stringify(
        items.map(({ product_id, description, quantity, unit_price }) => ({
          product_id: product_id || null,
          description,
          quantity: Number(quantity),
          unit_price: Number(unit_price),
        }))
      )
    );
    formData.set("subtotal", String(subtotal));

    try {
      await createInvoice(formData);
    } catch (err: unknown) {
      // redirect() throws internally — re-throw so Next.js handles navigation
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NEXT_REDIRECT" || (err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setLoading(false);
    }
  }

  const selectClass =
    "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/finans/faturalar">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Yeni Fatura Oluştur</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type & Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Fatura Tipi & Başlık
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fatura Tipi</Label>
              <select
                name="invoice_type"
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value as "sale" | "purchase")}
                className={selectClass}
              >
                <option value="sale">Satış Faturası</option>
                <option value="purchase">Alış Faturası</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoice_date">Fatura Tarihi *</Label>
              <Input
                id="invoice_date"
                name="invoice_date"
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due_date">Vade Tarihi</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_rate">KDV Oranı (%)</Label>
              <select
                id="tax_rate"
                name="tax_rate"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className={selectClass}
              >
                <option value="0">%0 (KDV Yok)</option>
                <option value="10">%10</option>
                <option value="20">%20</option>
              </select>
            </div>

            {invoiceType === "sale" ? (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="customer_id">Müşteri *</Label>
                <select
                  id="customer_id"
                  name="customer_id"
                  required
                  className={selectClass}
                >
                  <option value="">Müşteri seçin...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="supplier_id">Tedarikçi / Fason Üretici *</Label>
                <select id="supplier_id" name="supplier_id" required className={selectClass}>
                  <option value="">Tedarikçi seçin...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.company_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
              Ürünler / Kalemler
            </h2>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4" />
              Kalem Ekle
            </Button>
          </div>

          <div className="space-y-3">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500 px-1">
              <div className="col-span-4">Ürün Seç</div>
              <div className="col-span-3">Açıklama</div>
              <div className="col-span-1 text-center">Miktar</div>
              <div className="col-span-2 text-right">Birim Fiyat</div>
              <div className="col-span-1 text-right">Toplam</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                {/* Product selector */}
                <div className="col-span-4">
                  <select
                    value={item.product_id}
                    onChange={(e) => handleProductSelect(item.id, e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Ürün seçin...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                  </select>
                </div>
                {/* Description */}
                <div className="col-span-3">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, "description", e.target.value)}
                    placeholder="Açıklama"
                  />
                </div>
                {/* Quantity */}
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, "quantity", Number(e.target.value))
                    }
                    className="text-center px-1"
                  />
                </div>
                {/* Unit price */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateItem(item.id, "unit_price", Number(e.target.value))
                    }
                    className="text-right"
                  />
                </div>
                {/* Line total */}
                <div className="col-span-1 text-right text-sm font-medium text-slate-700">
                  {(item.quantity * item.unit_price).toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                {/* Remove */}
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ara Toplam</span>
              <span>₺{subtotal.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">KDV (%{taxRate})</span>
              <span>₺{taxAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t border-slate-100 pt-2">
              <span>Genel Toplam</span>
              <span className="text-green-700">
                ₺{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <input type="hidden" name="subtotal" value={subtotal} />
          <input
            type="hidden"
            name="items_json"
            value={JSON.stringify(
              items.map(({ product_id, description, quantity, unit_price }) => ({
                product_id: product_id || null,
                description,
                quantity,
                unit_price,
              }))
            )}
          />
        </div>

        {/* Payment Plan */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Ödeme Planı
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="installments">Taksit Sayısı</Label>
              <select
                id="installments"
                name="installments"
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className={selectClass}
              >
                {[1, 2, 3, 4, 6, 9, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "Tek Ödeme" : `${n} Taksit`}
                  </option>
                ))}
              </select>
            </div>
            {installments > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="first_payment_date">İlk Ödeme Tarihi</Label>
                <Input id="first_payment_date" name="first_payment_date" type="date" />
              </div>
            )}
          </div>
          {installments > 1 && (
            <p className="text-sm text-slate-500">
              Her taksit: ₺
              {(total / installments).toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
              })}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Fatura notları..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Oluşturuluyor...
              </>
            ) : (
              "Fatura Oluştur"
            )}
          </Button>
          <Button asChild variant="outline">
            <Link href="/finans/faturalar">İptal</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
