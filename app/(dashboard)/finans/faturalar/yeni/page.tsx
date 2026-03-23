import { createClient } from "@/lib/supabase/server";
import YeniFaturaForm from "./form";

export default async function YeniFaturaPage() {
  const supabase = await createClient();
  const [{ data: customers }, { data: products }, { data: suppliers }] = await Promise.all([
    supabase.from("customers").select("id, company_name").order("company_name"),
    supabase.from("products").select("id, name, unit, unit_price").eq("is_active", true).order("name"),
    supabase.from("suppliers").select("id, company_name").eq("is_active", true).order("company_name"),
  ]);

  return (
    <YeniFaturaForm
      customers={(customers as { id: string; company_name: string }[]) || []}
      products={(products as { id: string; name: string; unit: string; unit_price: number | null }[]) || []}
      suppliers={(suppliers as { id: string; company_name: string }[]) || []}
    />
  );
}
