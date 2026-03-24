"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, Search, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { bulkUpdateSegment } from "@/actions/customers";
import { HeatScoreBadge, parseHeatScoreFromNotes } from "@/components/musteriler/heat-score-badge";

const SEGMENT_CONFIG = {
  lead: { label: "Aday", variant: "warning" as const },
  active: { label: "Aktif", variant: "success" as const },
  passive: { label: "Pasif", variant: "muted" as const },
};

type Customer = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  district: string | null;
  segment: "lead" | "active" | "passive";
  created_at: string;
  notes?: string | null;
};

interface CustomerGridProps {
  customers: Customer[];
}

export function CustomerGrid({ customers }: CustomerGridProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === customers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(customers.map((c) => c.id)));
    }
  };

  const handleBulkSegment = (segment: "lead" | "active" | "passive") => {
    if (selected.size === 0) return;
    startTransition(async () => {
      await bulkUpdateSegment(Array.from(selected), segment);
      setSelected(new Set());
    });
  };

  const isSelectionMode = selected.size > 0;

  return (
    <>
      {/* Bulk Actions Bar */}
      {isSelectionMode && (
        <div className="sticky top-0 z-10 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAll}
              className="w-5 h-5 rounded border border-green-400 bg-green-100 flex items-center justify-center"
            >
              {selected.size === customers.length && <Check className="w-3 h-3 text-green-700" />}
            </button>
            <span className="text-sm font-medium text-green-700">
              {selected.size} müşteri seçildi
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-600 mr-1">Segment Değiştir:</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => handleBulkSegment("lead")}
              disabled={isPending}
            >
              Aday
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => handleBulkSegment("active")}
              disabled={isPending}
            >
              Aktif
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-slate-300 text-slate-600 hover:bg-slate-50"
              onClick={() => handleBulkSegment("passive")}
              disabled={isPending}
            >
              Pasif
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-slate-500"
              onClick={() => setSelected(new Set())}
            >
              İptal
            </Button>
          </div>
        </div>
      )}

      {/* Customer Grid */}
      {customers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {customers.map((customer) => {
            const seg = SEGMENT_CONFIG[customer.segment] || SEGMENT_CONFIG.lead;
            const isSelected = selected.has(customer.id);
            return (
              <div
                key={customer.id}
                className={`relative bg-white rounded-xl border p-5 transition-all group ${
                  isSelected
                    ? "border-green-400 ring-2 ring-green-200"
                    : "border-slate-200 hover:border-green-300 hover:shadow-md"
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(customer.id)}
                  className={`absolute top-3 left-3 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-green-600 border-green-600"
                      : "border-slate-300 bg-white opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>

                <Link href={`/musteriler/${customer.id}`} className="block">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1 pl-5">
                      <h3 className="font-semibold text-slate-800 group-hover:text-green-700 transition-colors truncate">
                        {customer.company_name}
                      </h3>
                      {customer.contact_name && (
                        <p className="text-sm text-slate-500 truncate">{customer.contact_name}</p>
                      )}
                    </div>
                    <Badge variant={seg.variant} className="ml-2 flex-shrink-0">
                      {seg.label}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.city && (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{customer.city}{customer.district ? `, ${customer.district}` : ""}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Eklenme: {formatDate(customer.created_at)}</span>
                    <HeatScoreBadge
                      customerId={customer.id}
                      customerName={customer.company_name}
                      cachedScore={parseHeatScoreFromNotes(customer.notes)}
                    />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">Müşteri bulunamadı</p>
          <p className="text-slate-400 text-sm mt-1">Yeni bir müşteri ekleyin veya arama kriterlerini değiştirin</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/musteriler/yeni">
              <Plus className="w-4 h-4" />
              Yeni Müşteri Ekle
            </Link>
          </Button>
        </div>
      )}
    </>
  );
}
