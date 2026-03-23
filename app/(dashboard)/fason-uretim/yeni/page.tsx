import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import YeniFasonSiparisForm from "./form";

export default async function YeniFasonSiparisPage() {
  const supabase = await createClient();
  const [{ data: suppliers }, { data: products }] = await Promise.all([
    supabase.from("suppliers").select("id, company_name").eq("is_active", true).order("company_name"),
    supabase.from("products").select("id, name, unit, unit_cost").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/fason-uretim">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-slate-800">Yeni Fason Sipariş</h1>
      </div>

      <YeniFasonSiparisForm
        suppliers={(suppliers ?? []) as { id: string; company_name: string }[]}
        products={(products ?? []) as { id: string; name: string; unit: string; unit_cost: number | null }[]}
      />
    </div>
  );
}
