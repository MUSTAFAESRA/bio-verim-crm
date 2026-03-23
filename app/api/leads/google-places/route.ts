import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const keyword = searchParams.get("keyword") || "tarım gübre çiftçi";
  const radius = searchParams.get("radius") || "10000";

  if (!city) {
    return NextResponse.json({ error: "Şehir parametresi gerekli" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey || apiKey === "your_google_places_server_key") {
    // Return mock data if API key not configured
    return NextResponse.json({
      results: [
        {
          place_id: "mock_1",
          name: "Örnek Tarım İşletmesi (Demo)",
          formatted_address: `${city} Merkez`,
          formatted_phone_number: "0532 000 00 01",
          geometry: { location: { lat: 40.0, lng: 29.0 } },
          already_added: false,
        },
        {
          place_id: "mock_2",
          name: "Demo Çiftlik ve Tarım (Demo)",
          formatted_address: `${city} Köy Mah.`,
          formatted_phone_number: "0533 000 00 02",
          geometry: { location: { lat: 40.01, lng: 29.01 } },
          already_added: false,
        },
      ],
      note: "Demo modu: Gerçek sonuçlar için GOOGLE_PLACES_API_KEY ortam değişkenini ayarlayın",
    });
  }

  try {
    // Geocode city first
    const geocodeRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city + ", Turkey")}&key=${apiKey}`
    );
    const geocodeData = await geocodeRes.json();

    if (!geocodeData.results?.[0]) {
      return NextResponse.json({ error: "Şehir bulunamadı" }, { status: 404 });
    }

    const { lat, lng } = geocodeData.results[0].geometry.location;

    // Nearby search
    const placesRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}&language=tr&key=${apiKey}`
    );
    const placesData = await placesRes.json();

    if (!placesData.results) {
      return NextResponse.json({ results: [] });
    }

    // Check which ones are already in DB
    const supabase = await createClient();
    const placeIds = placesData.results.map((p: { place_id: string }) => p.place_id);
    const { data: existing } = await supabase
      .from("leads")
      .select("source_ref_id")
      .in("source_ref_id", placeIds);

    const existingIds = new Set(existing?.map((e) => e.source_ref_id) ?? []);

    const results = placesData.results.map((place: {
      place_id: string;
      name: string;
      vicinity: string;
      formatted_phone_number?: string;
      geometry: { location: { lat: number; lng: number } };
    }) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.vicinity,
      formatted_phone_number: place.formatted_phone_number,
      geometry: place.geometry,
      already_added: existingIds.has(place.place_id),
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Google Places API hatası" }, { status: 500 });
  }
}
