import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import TeklifForm from "./form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function YeniTeklifPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customerRaw }, { data: productsRaw }] = await Promise.all([
    supabase.from("customers").select("id, company_name, contact_name").eq("id", id).single(),
    supabase.from("products").select("id, name, sku, unit, unit_price").eq("is_active", true).order("name"),
  ]);

  if (!customerRaw) notFound();

  return (
    <TeklifForm
      customer={customerRaw as any}
      products={(productsRaw ?? []) as any[]}
    />
  );
}
