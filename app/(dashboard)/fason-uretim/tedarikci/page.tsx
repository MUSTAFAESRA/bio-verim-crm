import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, Phone, MapPin, Factory, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { SupplierDeleteButton } from "@/components/fason/supplier-delete-button";
import type { Supplier } from "@/lib/db-types";

export default async function TedarikciPage() {
  const supabase = await createClient();
  const { data: suppliersRaw } = await supabase
    .from("suppliers")
    .select("*")
    .order("company_name");
  const suppliers = suppliersRaw as unknown as Supplier[] | null;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Fason Üretim Tesisleri</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tedarikçi firmalar ve üretim tesisleri</p>
        </div>
        <Button asChild size="sm">
          <Link href="/fason-uretim/tedarikci/yeni">
            <Plus className="w-4 h-4" />
            Yeni Tedarikçi
          </Link>
        </Button>
      </div>

      {suppliers && suppliers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Factory className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{s.company_name}</h3>
                    {s.contact_name && (
                      <p className="text-xs text-slate-400">{s.contact_name}</p>
                    )}
                  </div>
                </div>
                <Badge variant={s.is_active ? "success" : "muted"} className="text-xs">
                  {s.is_active ? "Aktif" : "Pasif"}
                </Badge>
              </div>

              <div className="space-y-1.5 mb-4">
                {s.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Phone className="w-3.5 h-3.5" />
                    <a href={`tel:${s.phone}`} className="hover:text-green-600">
                      {s.phone}
                    </a>
                  </div>
                )}
                {s.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{s.city}</span>
                  </div>
                )}
                {s.capacity_liters && (
                  <p className="text-xs text-slate-400">
                    Kapasite: {formatNumber(s.capacity_liters)} litre/gün
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <Button asChild variant="outline" size="sm" className="flex-1 h-8 text-xs">
                  <Link href={`/fason-uretim/tedarikci/${s.id}`}>
                    <Pencil className="w-3 h-3 mr-1" />
                    Düzenle
                  </Link>
                </Button>
                <SupplierDeleteButton id={s.id} name={s.company_name} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Factory className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Henüz tedarikçi eklenmemiş</p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/fason-uretim/tedarikci/yeni">İlk Tedarikçiyi Ekle</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
