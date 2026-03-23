import { createClient } from "@/lib/supabase/server";
import TemasForm from "./form";

interface PageProps {
  searchParams: Promise<{ customer_id?: string }>;
}

export default async function YeniTemasPage({ searchParams }: PageProps) {
  const { customer_id } = await searchParams;
  const supabase = await createClient();

  const [{ data: customers }, { data: templates }] = await Promise.all([
    supabase.from("customers").select("id, company_name, contact_name").order("company_name").limit(200),
    supabase.from("message_templates").select("*").order("channel"),
  ]);

  const redirectTo = customer_id ? `/musteriler/${customer_id}` : "/iletisim";

  return (
    <TemasForm
      customers={(customers as any[]) || []}
      templates={(templates as any[]) || []}
      defaultCustomerId={customer_id}
      redirectTo={redirectTo}
    />
  );
}
