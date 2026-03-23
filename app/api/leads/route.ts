import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const formData = await request.formData();
  const sourceRefId = formData.get("source_ref_id") as string | null;

  // Duplicate check
  if (sourceRefId) {
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("source_ref_id", sourceRefId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Bu işletme zaten aday listesinde mevcut." },
        { status: 409 }
      );
    }
  }

  const data = {
    business_name: formData.get("business_name") as string,
    contact_name: (formData.get("contact_name") as string) || null,
    phone: (formData.get("phone") as string) || null,
    email: (formData.get("email") as string) || null,
    city: (formData.get("city") as string) || null,
    address: (formData.get("address") as string) || null,
    latitude: formData.get("latitude") ? Number(formData.get("latitude")) : null,
    longitude: formData.get("longitude") ? Number(formData.get("longitude")) : null,
    source: ((formData.get("source") as string) || "manual") as "google_places" | "linkedin" | "facebook_lead" | "manual" | "other",
    source_ref_id: sourceRefId,
    status: "new" as const,
    notes: (formData.get("notes") as string) || null,
    created_by: user.id,
    assigned_to: user.id,
  };

  const { data: leadInserted, error } = await supabase.from("leads").insert(data).select("id").single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leadId = (leadInserted as unknown as { id: string }).id;
  return NextResponse.json({ id: leadId });
}
