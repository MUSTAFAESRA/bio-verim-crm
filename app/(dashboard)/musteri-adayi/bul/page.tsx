"use client";

import { useState } from "react";
import {
  Search, MapPin, Phone, Plus, Loader2, Star, Globe,
  ExternalLink, CheckCircle2, Building2, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";

// Türkiye'nin 81 ili
const ILLER = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya",
  "Ardahan","Artvin","Aydın","Balıkesir","Bartın","Batman","Bayburt","Bilecik",
  "Bingöl","Bitlis","Bolu","Burdur","Bursa","Çanakkale","Çankırı","Çorum",
  "Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir",
  "Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul",
  "İzmir","Kahramanmaraş","Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis",
  "Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya","Kütahya","Malatya","Manisa",
  "Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye","Rize",
  "Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ",
  "Tokat","Trabzon","Tunceli","Uşak","Van","Yalova","Yozgat","Zonguldak",
];

// Arama kategorileri
const KATEGORILER = [
  { label: "Gübre Bayi", value: "gübre bayi" },
  { label: "Tarım Gübre Bayi", value: "tarım gübre bayi" },
  { label: "Organik Gübre", value: "organik gübre satış" },
  { label: "Zirai Gübre", value: "zirai gübre" },
  { label: "Tarım Malzemeleri", value: "tarım malzemeleri satış" },
  { label: "Zirai İlaç & Gübre", value: "zirai ilaç gübre bayi" },
  { label: "Tarım Bayii", value: "tarım bayii" },
  { label: "Çiftçi Kooperatifi", value: "tarım kooperatifi" },
];

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  city: string;
  formatted_phone_number: string | null;
  website: string | null;
  rating: number | null;
  reviews_count: number;
  category: string | null;
  maps_url: string | null;
  geometry: { location: { lat: number; lng: number } };
  already_added: boolean;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600";

export default function ApifyAramaSayfasi() {
  const [city, setCity] = useState("");
  const [keyword, setKeyword] = useState("gübre bayi");
  const [customKeyword, setCustomKeyword] = useState("");
  const [maxResults, setMaxResults] = useState("20");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [searchedCity, setSearchedCity] = useState("");

  const activeKeyword = customKeyword.trim() || keyword;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!city) return;
    setLoading(true);
    setError("");
    setResults([]);
    setSearchedCity(city);

    try {
      const params = new URLSearchParams({
        city,
        keyword: activeKeyword,
        max: maxResults,
      });
      const res = await fetch(`/api/leads/apify-search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Arama başarısız");
      setResults(data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Arama sırasında hata oluştu");
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
      formData.set("city", place.city || searchedCity);
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
      alert(err instanceof Error ? err.message : "Hata");
    } finally {
      setAddingId(null);
    }
  }

  const addedCount = results.filter(
    (r) => addedIds.has(r.place_id) || r.already_added
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Türkiye'de Gübre Bayi Bul</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Google Maps üzerinden il bazında gübre / tarım bayilerini tarayın, müşteri adayına ekleyin
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/musteri-adayi">← Geri</Link>
        </Button>
      </div>

      {/* Arama Formu */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* İl seç */}
            <div className="space-y-1.5">
              <Label>İl *</Label>
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={selectClass}
                  required
                >
                  <option value="">İl seçin...</option>
                  {ILLER.map((il) => (
                    <option key={il} value={il}>{il}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <Label>Arama Kategorisi</Label>
              <div className="relative">
                <select
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setCustomKeyword(""); }}
                  className={selectClass}
                >
                  {KATEGORILER.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Özel arama */}
            <div className="space-y-1.5">
              <Label>Özel Anahtar Kelime</Label>
              <input
                type="text"
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                placeholder="Kategoriyi geçersiz kılar..."
                className={selectClass}
              />
            </div>

            {/* Maks sonuç */}
            <div className="space-y-1.5">
              <Label>Maks. Sonuç</Label>
              <div className="relative">
                <select
                  value={maxResults}
                  onChange={(e) => setMaxResults(e.target.value)}
                  className={selectClass}
                >
                  <option value="10">10 sonuç</option>
                  <option value="20">20 sonuç</option>
                  <option value="30">30 sonuç</option>
                  <option value="40">40 sonuç</option>
                </select>
                <ChevronDown className="absolute right-2 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Aktif arama önizleme */}
          {city && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm text-green-700 flex items-center gap-2">
              <Search className="w-4 h-4 flex-shrink-0" />
              <span>
                Google Maps'te aranacak: <strong>"{activeKeyword} {city} Türkiye"</strong>
              </span>
            </div>
          )}

          <Button type="submit" disabled={loading || !city} className="w-full sm:w-auto px-8">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Taranıyor... (30-60 sn sürebilir)</>
            ) : (
              <><Search className="w-4 h-4" /> Google Maps'te Ara</>
            )}
          </Button>
        </form>
      </div>

      {/* Hata */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          <p className="font-medium">Hata: {error}</p>
          {error.includes("APIFY_TOKEN") && (
            <p className="mt-1 text-xs">
              .env.local dosyasına <code className="bg-red-100 px-1 rounded">APIFY_TOKEN=apify_api_xxxxx</code> ekleyin.
              Token almak için: <strong>apify.com</strong> → Settings → Integrations → API tokens
            </p>
          )}
        </div>
      )}

      {/* Sonuç özeti */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-600">
            <strong>{results.length}</strong> işletme bulundu
            {addedCount > 0 && (
              <span className="ml-2 text-green-600">· {addedCount} adaya eklendi</span>
            )}
          </p>
          <p className="text-xs text-slate-400">
            {searchedCity} · "{activeKeyword}"
          </p>
        </div>
      )}

      {/* Sonuçlar */}
      {results.length > 0 && (
        <div className="grid gap-3">
          {results.map((place) => {
            const isAdded = addedIds.has(place.place_id) || place.already_added;
            return (
              <div
                key={place.place_id}
                className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition-colors ${
                  isAdded ? "border-green-200 bg-green-50/30" : "border-slate-200"
                }`}
              >
                {/* İkon */}
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Building2 className="w-5 h-5 text-slate-400" />
                </div>

                {/* Bilgiler */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{place.name}</h3>
                    {place.category && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {place.category}
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {place.formatted_address && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{place.formatted_address}</span>
                      </div>
                    )}
                    {place.formatted_phone_number && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <a href={`tel:${place.formatted_phone_number}`} className="hover:text-green-600 font-medium">
                          {place.formatted_phone_number}
                        </a>
                      </div>
                    )}
                    {place.website && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500">
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                        <a
                          href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-green-600 truncate"
                        >
                          {place.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Rating */}
                  {place.rating && (
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-xs font-medium text-slate-600">{place.rating.toFixed(1)}</span>
                      {place.reviews_count > 0 && (
                        <span className="text-xs text-slate-400">({place.reviews_count} yorum)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Aksiyonlar */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "default"}
                    disabled={isAdded || addingId === place.place_id}
                    onClick={() => !isAdded && handleAddLead(place)}
                    className="min-w-[120px]"
                  >
                    {addingId === place.place_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isAdded ? (
                      <><CheckCircle2 className="w-3.5 h-3.5" /> Eklendi</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5" /> Adaya Ekle</>
                    )}
                  </Button>
                  {place.maps_url && (
                    <Button asChild size="sm" variant="ghost" className="min-w-[120px] text-xs text-slate-400">
                      <a href={place.maps_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" /> Haritada Gör
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Boş durum */}
      {!loading && results.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <Search className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Arama yapmak için il seçin</p>
          <p className="text-xs text-slate-400 mt-1">
            Apify Google Maps Scraper kullanır · APIFY_TOKEN gereklidir
          </p>
        </div>
      )}
    </div>
  );
}
