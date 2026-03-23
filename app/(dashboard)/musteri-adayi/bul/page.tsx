"use client";

import { useState } from "react";
import { Search, MapPin, Phone, Plus, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  geometry: {
    location: { lat: number; lng: number };
  };
  already_added?: boolean;
}

export default function GoogleAramaSayfasi() {
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("tarım çiftçi gübre");
  const [radius, setRadius] = useState("10000");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch(`/api/leads/google-places?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}&radius=${radius}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Arama başarısız");
      setResults(data.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Arama sırasında hata oluştu";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLead(place: PlaceResult) {
    setAddingId(place.place_id);
    try {
      const formData = new FormData();
      formData.set("business_name", place.name);
      formData.set("address", place.formatted_address);
      formData.set("phone", place.formatted_phone_number || "");
      formData.set("city", city);
      formData.set("latitude", String(place.geometry.location.lat));
      formData.set("longitude", String(place.geometry.location.lng));
      formData.set("source", "google_places");
      formData.set("source_ref_id", place.place_id);

      const res = await fetch("/api/leads", { method: "POST", body: formData });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Eklenemedi");
      }
      setAddedIds((prev) => new Set([...prev, place.place_id]));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Hata";
      alert(msg);
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Google ile Müşteri Adayı Bul</h1>
        <p className="text-sm text-slate-500 mt-0.5">Yakın çevrenizdeki tarım işletmelerini ve çiftçileri bulun</p>
      </div>

      {/* Search Form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="city">İl / Bölge *</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Örn: Bursa, Balıkesir"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="keyword">Anahtar Kelime</Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="tarım, çiftçi, gübre..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="radius">Yarıçap</Label>
            <select
              id="radius"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="5000">5 km</option>
              <option value="10000">10 km</option>
              <option value="25000">25 km</option>
              <option value="50000">50 km</option>
            </select>
          </div>
          <div className="sm:col-span-3 flex gap-3">
            <Button type="submit" disabled={loading || !city} className="flex-1">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Aranıyor...</>
              ) : (
                <><Search className="w-4 h-4" /> Ara</>
              )}
            </Button>
            <Button asChild variant="outline">
              <Link href="/musteri-adayi">Geri Dön</Link>
            </Button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
          {error.includes("API") && (
            <p className="mt-1 text-xs">
              Google Places API anahtarınızı .env.local dosyasına ekleyin: GOOGLE_PLACES_API_KEY
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{results.length} işletme bulundu</p>
          {results.map((place) => {
            const isAdded = addedIds.has(place.place_id) || place.already_added;
            return (
              <div key={place.place_id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800">{place.name}</h3>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{place.formatted_address}</span>
                    </div>
                    {place.formatted_phone_number && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <a href={`tel:${place.formatted_phone_number}`} className="hover:text-green-600">
                          {place.formatted_phone_number}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    disabled={isAdded || addingId === place.place_id}
                    onClick={() => !isAdded && handleAddLead(place)}
                  >
                    {addingId === place.place_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isAdded ? (
                      "Eklendi ✓"
                    ) : (
                      <><Plus className="w-3.5 h-3.5" /> Listeye Ekle</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && results.length === 0 && city && !error && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aramak için yukarıdaki formu doldurun</p>
          <p className="text-xs text-slate-400 mt-1">
            Not: Google Places API anahtarı gereklidir
          </p>
        </div>
      )}
    </div>
  );
}
