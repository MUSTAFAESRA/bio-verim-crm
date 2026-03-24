"use client";

import { useState } from "react";
import { Facebook, Search, Loader2, Plus, Check, ArrowLeft, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Gerçek grup URL'si Facebook'tan kopyalanmalı — örnek format
const PRESET_GROUPS = [
  { label: "Örnek format", url: "https://www.facebook.com/groups/GRUP_ID_BURAYA" },
];

interface FacebookResult {
  name: string;
  profile_url: string | null;
  location: string | null;
  about: string | null;
  already_added: boolean;
}

export default function FacebookSearchPage() {
  const [groupUrl, setGroupUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [results, setResults] = useState<FacebookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  async function handleSearch() {
    if (!groupUrl) {
      setError("Grup URL'si girin.");
      return;
    }
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const params = new URLSearchParams({ groupUrl, keyword, max: String(maxResults) });
      const res = await fetch(`/api/leads/facebook-search?${params}`);
      const data = await res.json();
      if (data.error === "NO_TOKEN") {
        setError("APIFY_TOKEN bulunamadı. .env.local dosyasını kontrol edin.");
      } else if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results ?? []);
        if ((data.results ?? []).length === 0) setError("Sonuç bulunamadı. Grup herkese açık olmalı ve gerçek bir Facebook grup URL'si girilmeli (facebook.com/groups/GRUPID).");
      }
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddLead(result: FacebookResult) {
    const key = result.profile_url || result.name;
    setAddingId(key);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: result.name,
          city: result.location || null,
          source: "facebook_lead",
          source_ref_id: result.profile_url || null,
          notes: result.about || null,
        }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set([...prev, key]));
        setResults((prev) =>
          prev.map((r) => ((r.profile_url || r.name) === key ? { ...r, already_added: true } : r))
        );
      }
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
          <Facebook className="w-5 h-5 text-blue-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Facebook Grup Tarama</h1>
            <p className="text-sm text-slate-500">Tarım gruplarındaki üyeleri potansiyel müşteri olarak bulun</p>
          </div>
        </div>
      </div>

      {/* Lead Ads link */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="font-medium text-blue-800 text-sm">Facebook Lead Ads otomatik çekme</p>
          <p className="text-xs text-blue-600 mt-0.5">Reklam formlarınızdan gelen leadleri otomatik CRM&apos;e aktarın</p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
          <Link href="/musteri-adayi/facebook-setup">Kurulum Rehberi</Link>
        </Button>
      </div>

      {/* Search form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600">Facebook Grup URL</label>
            <input
              value={groupUrl}
              onChange={(e) => setGroupUrl(e.target.value)}
              placeholder="https://www.facebook.com/groups/..."
              className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {PRESET_GROUPS.map((g) => (
                <button
                  key={g.url}
                  onClick={() => setGroupUrl(g.url)}
                  className="text-xs px-2 py-0.5 rounded-full border border-slate-200 text-slate-500 hover:border-blue-400 transition-colors"
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Anahtar Kelime Filtresi</label>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="örn. gübre, çiftçi"
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Maks. Üye</label>
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
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Taranıyor...</>
            ) : (
              <><Search className="w-4 h-4" /> Grubu Tara</>
            )}
          </Button>
          {results.length > 0 && (
            <span className="text-sm text-slate-500">{results.length} üye bulundu</span>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 space-y-1">
          <p><strong>Nasıl kullanılır:</strong></p>
          <p>1. Facebook&apos;ta herkese açık bir tarım grubuna girin</p>
          <p>2. Tarayıcı adres çubuğundaki URL&apos;yi kopyalayın (örn: facebook.com/groups/123456789)</p>
          <p>3. Apify hesabında <code className="bg-amber-100 px-1 rounded">apify/facebook-groups-scraper</code> aktörüne erişim gereklidir</p>
          <p>4. Grup <strong>herkese açık (public)</strong> olmalı · Arama 30-90 saniye sürer</p>
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
            const key = result.profile_url || result.name;
            const isAdded = result.already_added || addedIds.has(key);
            const isAdding = addingId === key;
            return (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{result.name}</h3>
                      {result.location && <p className="text-xs text-slate-500">📍 {result.location}</p>}
                    </div>
                  </div>
                  {isAdded && (
                    <span className="text-xs text-green-600 font-medium ml-2 flex-shrink-0 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Eklendi
                    </span>
                  )}
                </div>

                {result.about && (
                  <p className="text-xs text-slate-500 line-clamp-2">{result.about}</p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {result.profile_url && (
                    <a
                      href={result.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" /> Facebook
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
