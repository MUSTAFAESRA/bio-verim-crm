"use client";

import { useState } from "react";
import { Linkedin, Search, Loader2, Plus, Check, ArrowLeft, Building2, Users, Globe, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEYWORDS = [
  "gübre bayi",
  "zirai ürünler",
  "tarım kooperatifi",
  "organik tarım",
  "ziraat mühendisi",
  "tarım ilaçları",
  "zirai mücadele",
  "tarım danışmanlık",
];

const CITIES = [
  "Türkiye", "İstanbul", "Ankara", "İzmir", "Antalya", "Konya", "Bursa", "Adana",
  "Gaziantep", "Mersin", "Eskişehir", "Kayseri", "Samsun", "Balıkesir",
];

interface LinkedInResult {
  name: string;
  description: string | null;
  website: string | null;
  city: string;
  industry: string | null;
  company_size: string | null;
  followers: number | null;
  linkedin_url: string | null;
  already_added: boolean;
}

export default function LinkedInSearchPage() {
  const [keyword, setKeyword] = useState("gübre bayi");
  const [city, setCity] = useState("Türkiye");
  const [maxResults, setMaxResults] = useState(20);
  const [results, setResults] = useState<LinkedInResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const params = new URLSearchParams({ keyword, city, max: String(maxResults) });
      const res = await fetch(`/api/leads/linkedin-search?${params}`);
      const data = await res.json();
      if (data.error === "NO_TOKEN") {
        setError("APIFY_TOKEN ayarlanmamış. Google Maps araması çalışıyorsa LinkedIn de çalışır — lütfen .env.local dosyasını kontrol edin.");
      } else if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results ?? []);
        if ((data.results ?? []).length === 0) setError("Sonuç bulunamadı. Farklı bir anahtar kelime deneyin.");
      }
    } catch {
      setError("Bağlantı hatası. Sunucunun çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLead(result: LinkedInResult) {
    const key = result.linkedin_url || result.name;
    setAddingId(key);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: result.name,
          city: result.city,
          website: result.website,
          source: "linkedin",
          source_ref_id: result.linkedin_url || null,
          notes: [result.industry, result.company_size, result.description]
            .filter(Boolean)
            .join(" | ") || null,
        }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set([...prev, key]));
        setResults((prev) =>
          prev.map((r) =>
            (r.linkedin_url || r.name) === key ? { ...r, already_added: true } : r
          )
        );
      }
    } catch {
      // silently fail
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/musteri-adayi"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex items-center gap-2">
          <Linkedin className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">LinkedIn Şirket Arama</h1>
            <p className="text-sm text-slate-500">Tarım sektöründe potansiyel şirketleri bulun</p>
          </div>
        </div>
      </div>

      {/* Search form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Keyword */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600">Anahtar Kelime</label>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="örn. gübre bayi"
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {KEYWORDS.map((k) => (
                <button
                  key={k}
                  onClick={() => setKeyword(k)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    keyword === k
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-slate-200 text-slate-500 hover:border-blue-400"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Bölge</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Max */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Maks. Sonuç</label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Aranıyor...</>
            ) : (
              <><Search className="w-4 h-4" /> LinkedIn'de Ara</>
            )}
          </Button>
          {results.length > 0 && (
            <span className="text-sm text-slate-500">{results.length} şirket bulundu</span>
          )}
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
          <p><strong>Gereksinimler:</strong></p>
          <p>1. Apify hesabında <code className="bg-amber-100 px-1 rounded">bebity/linkedin-companies-scraper</code> aktörüne erişim</p>
          <p>2. LinkedIn oturum çerezi (session cookie) — aktör ayarlarından girilmeli</p>
          <p>3. Arama yaklaşık 60-90 saniye sürer · LinkedIn kısıtlamaları sonucu 0 sonuç dönebilir</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((result, idx) => {
            const key = result.linkedin_url || result.name;
            const isAdded = result.already_added || addedIds.has(key);
            const isAdding = addingId === key;
            return (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{result.name}</h3>
                      {result.industry && <p className="text-xs text-slate-500">{result.industry}</p>}
                    </div>
                  </div>
                  {isAdded && (
                    <span className="text-xs text-green-600 font-medium ml-2 flex-shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Eklendi
                    </span>
                  )}
                </div>

                {result.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{result.description}</p>
                )}

                <div className="space-y-1">
                  {result.city && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>📍</span> {result.city}
                    </div>
                  )}
                  {result.company_size && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="w-3 h-3" /> {result.company_size}
                    </div>
                  )}
                  {result.followers && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Linkedin className="w-3 h-3" /> {result.followers.toLocaleString("tr-TR")} takipçi
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {result.website && (
                    <a
                      href={result.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600"
                    >
                      <Globe className="w-3 h-3" /> Web
                    </a>
                  )}
                  {result.linkedin_url && (
                    <a
                      href={result.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> LinkedIn
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant={isAdded ? "outline" : "default"}
                    disabled={isAdded || isAdding}
                    onClick={() => handleAddLead(result)}
                    className={`ml-auto h-7 text-xs ${!isAdded ? "bg-green-600 hover:bg-green-700" : ""}`}
                  >
                    {isAdding ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isAdded ? (
                      <><Check className="w-3 h-3" /> Eklendi</>
                    ) : (
                      <><Plus className="w-3 h-3" /> Adaya Ekle</>
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
