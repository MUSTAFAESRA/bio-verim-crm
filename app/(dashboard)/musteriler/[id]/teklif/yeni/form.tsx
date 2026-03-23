"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createQuote } from "@/actions/quotes";

interface Product {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unit_price: number | null;
}

interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
}

interface LineItem {
  id: number;
  product_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
}

interface Props {
  customer: Customer;
  products: Product[];
}

const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600";

export default function TeklifForm({ customer, products }: Props) {
  const [loading, setLoading] = useState(false);
  const [taxRate, setTaxRate] = useState(20);
  const [items, setItems] = useState<LineItem[]>([
    { id: 1, product_id: "", description: "", quantity: 1, unit_price: 0, discount_percent: 0 },
  ]);

  const lineTotal = (item: LineItem) =>
    item.quantity * item.unit_price * (1 - item.discount_percent / 100);

  const subtotal = items.reduce((sum, i) => sum + lineTotal(i), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  const addItem = () =>
    setItems([...items, { id: Date.now(), product_id: "", description: "", quantity: 1, unit_price: 0, discount_percent: 0 }]);

  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: number, field: keyof LineItem, value: string | number) =>
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleProductSelect = (itemId: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setItems(items.map(i =>
        i.id === itemId
          ? { ...i, product_id: productId, description: product.name, unit_price: product.unit_price ?? 0 }
          : i
      ));
    } else {
      updateItem(itemId, "product_id", productId);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("subtotal", String(subtotal));
    formData.set("items_json", JSON.stringify(
      items.map(({ product_id, description, quantity, unit_price, discount_percent }) => ({
        product_id: product_id || null,
        description,
        quantity: Number(quantity),
        unit_price: Number(unit_price),
        discount_percent: Number(discount_percent),
      }))
    ));
    try {
      await createQuote(formData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NEXT_REDIRECT" || (err as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/musteriler/${customer.id}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Yeni Teklif Oluştur</h1>
          <p className="text-sm text-slate-500">{customer.company_name}{customer.contact_name ? ` — ${customer.contact_name}` : ""}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="customer_id" value={customer.id} />

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Teklif Bilgileri</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="valid_until">Geçerlilik Tarihi</Label>
              <Input
                id="valid_until"
                name="valid_until"
                type="date"
                defaultValue={(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  return d.toISOString().split("T")[0];
                })()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_rate">KDV Oranı (%)</Label>
              <select
                id="tax_rate"
                name="tax_rate"
                value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))}
                className={selectClass}
              >
                <option value="0">%0 (KDV Yok)</option>
                <option value="10">%10</option>
                <option value="20">%20</option>
              </select>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ürünler / Kalemler</h2>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4" /> Kalem Ekle
            </Button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-400 px-1">
            <div className="col-span-4">Ürün</div>
            <div className="col-span-2 text-center">Miktar</div>
            <div className="col-span-2 text-right">Birim Fiyat</div>
            <div className="col-span-1 text-center">İndirim %</div>
            <div className="col-span-2 text-right">Tutar</div>
            <div className="col-span-1"></div>
          </div>

          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                {/* Product select */}
                <div className="col-span-4">
                  <select
                    value={item.product_id}
                    onChange={e => handleProductSelect(item.id, e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Ürün seçin...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    <option value="__custom">— Özel kalem —</option>
                  </select>
                  {/* Description (shown when custom or product selected) */}
                  {(item.product_id === "__custom" || (item.product_id && item.description !== products.find(p => p.id === item.product_id)?.name)) && (
                    <Input
                      value={item.description}
                      onChange={e => updateItem(item.id, "description", e.target.value)}
                      placeholder="Açıklama"
                      className="mt-1 text-xs"
                    />
                  )}
                  {!item.product_id && (
                    <Input
                      value={item.description}
                      onChange={e => updateItem(item.id, "description", e.target.value)}
                      placeholder="Açıklama giriniz"
                      className="mt-1 text-xs"
                    />
                  )}
                </div>

                {/* Quantity */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={item.quantity}
                    onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
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
                    onChange={e => updateItem(item.id, "unit_price", Number(e.target.value))}
                    className="text-right"
                  />
                </div>

                {/* Discount */}
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={item.discount_percent}
                    onChange={e => updateItem(item.id, "discount_percent", Number(e.target.value))}
                    className="text-center px-1"
                  />
                </div>

                {/* Line total */}
                <div className="col-span-2 text-right text-sm font-semibold text-slate-700">
                  ₺{lineTotal(item).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
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
          <div className="border-t border-slate-100 pt-4 space-y-2 max-w-xs ml-auto">
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
              <span className="text-green-700">₺{total.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <input type="hidden" name="subtotal" value={subtotal} />
          <input type="hidden" name="items_json" value={JSON.stringify(
            items.map(({ product_id, description, quantity, unit_price, discount_percent }) => ({
              product_id: product_id || null,
              description,
              quantity,
              unit_price,
              discount_percent,
            }))
          )} />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notlar / Özel Koşullar</Label>
            <Textarea id="notes" name="notes" placeholder="Teklif notları, teslimat koşulları..." rows={3} />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Kaydediliyor...</> : "Teklif Oluştur"}
          </Button>
          <Button asChild variant="outline">
            <Link href={`/musteriler/${customer.id}`}>İptal</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
