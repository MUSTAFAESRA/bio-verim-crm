import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120; // Vercel timeout extension

interface ApifyPlace {
  title?: string;
  totalScore?: number;
  reviewsCount?: number;
  address?: string;
  street?: string;
  city?: string;
  phone?: string;
  website?: string;
  location?: { lat: number; lng: number };
  placeId?: string;
  url?: string;
  categoryName?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const keyword = searchParams.get("keyword") || "gübre bayi";
  const maxResults = Math.min(Number(searchParams.get("max") || "20"), 40);

  if (!city) {
    return NextResponse.json({ error: "İl parametresi gerekli" }, { status: 400 });
  }

  const apifyToken = process.env.APIFY_TOKEN;

  if (!apifyToken || apifyToken.startsWith("your_") || apifyToken === "") {
    return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });
  }

  const searchQuery = `${keyword} ${city} Türkiye`;

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/nwua9Gu5YrADL7ZDj/run-sync-get-dataset-items?token=${apifyToken}&timeout=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchStringsArray: [searchQuery],
          maxCrawledPlacesPerSearch: maxResults,
          language: "tr",
          countryCode: "tr",
          includeHistogram: false,
          includeOpeningHours: false,
          includePeopleAlsoSearch: false,
          additionalInfo: false,
        }),
        signal: AbortSignal.timeout(100_000),
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      console.error("Apify error:", err);
      return NextResponse.json({ error: "Apify arama hatası: " + runRes.statusText }, { status: 502 });
    }

    const places: ApifyPlace[] = await runRes.json();

    // Check which place_ids already exist in leads
    const supabase = await createClient();
    const placeIds = places.map((p) => p.placeId).filter(Boolean) as string[];
    const { data: existing } = await supabase
      .from("leads")
      .select("source_ref_id")
      .in("source_ref_id", placeIds);

    const existingIds = new Set(existing?.map((e) => e.source_ref_id) ?? []);

    const results = places
      .filter((p) => p.title)
      .map((p) => ({
        place_id: p.placeId || `apify_${Math.random()}`,
        name: p.title ?? "",
        formatted_address: p.address || p.street || "",
        city: p.city || city,
        formatted_phone_number: p.phone || null,
        website: p.website || null,
        rating: p.totalScore || null,
        reviews_count: p.reviewsCount || 0,
        category: p.categoryName || null,
        maps_url: p.url || null,
        geometry: {
          location: p.location ?? { lat: 0, lng: 0 },
        },
        already_added: existingIds.has(p.placeId ?? ""),
      }));

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    console.error("Apify fetch error:", err);
    return NextResponse.json({ error: "Apify bağlantı hatası. Token ve bağlantıyı kontrol edin." }, { status: 500 });
  }
}
