import { createClient } from "@/lib/supabase/server";
import YeniFaturaForm from "./form";

export default async function YeniFaturaPage() {
  const supabase = await createClient();
  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase.from("customers").select("id, company_name").order("company_name"),
    supabase
      .from("products")
      .select("id, name, unit, unit_price")
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <YeniFaturaForm
      customers={(customers as { id: string; company_name: string }[]) || []}
      products={
        (products as {
          id: string;
          name: string;
          unit: string;
          unit_price: number | null;
        }[]) || []
      }
    />
  );
}
