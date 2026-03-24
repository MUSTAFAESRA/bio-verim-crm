"use client";

import { useState } from "react";
import { Instagram, Search, Loader2, Plus, Check, ArrowLeft, Hash, Users, ExternalLink, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const PRESET_HASHTAGS = [
  "#gübre",
  "#organikgübre",
  "#tarım",
  "#organiktarım",
  "#zirai",
  "#çiftçi",
  "#bitkibesleme",
  "#toprakanalizi",
  "#seracılık",
  "#organik",
];

interface InstagramResult {
  username: string;
  full_name: string | null;
  post_url: string | null;
  profile_url: string | null;
  already_added: boolean;
}

export default function InstagramSearchPage() {
  const [hashtag, setHashtag] = useState("gübre");
  const [minFollowers, setMinFollowers] = useState(1000);
  const [maxResults, setMaxResults] = useState(20);
  const [results, setResults] = useState<InstagramResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addedKolIds, setAddedKolIds] = useState<Set<string>>(new Set());

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setResults([]);
    const cleanTag = hashtag.replace(/^#/, "");
    try {
      const params = new URLSearchParams({
        hashtag: cleanTag,
        minFollowers: String(minFollowers),
        max: String(maxResults),
      });
      const res = await fetch(`/api/leads/instagram-search?${params}`);
      const data = await res.json();
      if (data.error === "NO_TOKEN") {
        setError("APIFY_TOKEN bulunamadı. .env.local dosyasını kontrol edin.");
      } else if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results ?? []);
        if ((data.results ?? []).length === 0) {
          setError(`#${cleanTag} için sonuç bulunamadı. Farklı bir hashtag deneyin.`);
        }
      }
    } catch {
      setError("Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddKol(result: InstagramResult) {
    setAddingId(`kol-${result.username}`);
    try {
      const res = await fetch("/api/influencer-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: result.full_name || result.username,
          platform: "instagram",
          profile_url: result.profile_url,
          status: "not_contacted",
        }),
      });
      if (res.ok) {
        setAddedKolIds((prev) => new Set([...prev, result.username]));
      }
    } finally {
      setAddingId(null);
    }
  }

  async function handleAddLead(result: InstagramResult) {
    setAddingId(`lead-${result.username}`);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: result.full_name || result.username,
          source: "other",
          source_ref_id: result.profile_url,
          notes: `Instagram: @${result.username}`,
        }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set([...prev, result.username]));
        setResults((prev) =>
          prev.map((r) => (r.username === result.username ? { ...r, already_added: true } : r))
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
          <Instagram className="w-5 h-5 text-pink-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Instagram Hashtag Tarama</h1>
            <p className="text-sm text-slate-500">Tarım hashtag&apos;larında aktif hesapları bulun ve KOL olarak ekleyin</p>
          </div>
        </div>
      </div>

      {/* Search form */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-xs font-medium text-slate-600">Hashtag</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value.replace(/^#/, ""))}
                placeholder="gübre (# işareti olmadan)"
                className="h-9 pl-8 pr-3 w-full rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {PRESET_HASHTAGS.map((tag) => {
                const clean = tag.replace(/^#/, "");
                return (
                  <button
                    key={tag}
                    onClick={() => setHashtag(clean)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      hashtag === clean
                        ? "bg-pink-500 text-white border-pink-500"
                        : "border-slate-200 text-slate-500 hover:border-pink-400"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Min. Takipçi</label>
              <select
                value={minFollowers}
                onChange={(e) => setMinFollowers(Number(e.target.value))}
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value={0}>Hepsi</option>
                <option value={500}>500+</option>
                <option value={1000}>1.000+</option>
                <option value={5000}>5.000+</option>
                <option value={10000}>10.000+</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Maks. Sonuç</label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
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
          <Button onClick={handleSearch} disabled={loading} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0">
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Taranıyor...</>
            ) : (
              <><Search className="w-4 h-4" /> Hashtag Tara</>
            )}
          </Button>
          {results.length > 0 && (
            <span className="text-sm text-slate-500">{results.length} hesap bulundu</span>
          )}
        </div>

        <div className="bg-pink-50 border border-pink-100 rounded-lg p-3 text-xs text-pink-700">
          <strong>Not:</strong> Hashtag'daki gönderilerden hesap sahipleri çıkarılır.
          Apify Instagram Scraper aktörü kullanılır (apify/instagram-scraper). Arama 30-90 saniye sürer.
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
            const isAdded = result.already_added || addedIds.has(result.username);
            const isKolAdded = addedKolIds.has(result.username);
            const isAddingLead = addingId === `lead-${result.username}`;
            const isAddingKol = addingId === `kol-${result.username}`;
            return (
              <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="font-semibold text-slate-800 truncate">@{result.username}</h3>
                    </div>
                    {result.full_name && result.full_name !== result.username && (
                      <p className="text-xs text-slate-500 truncate">{result.full_name}</p>
                    )}
                  </div>
                </div>

                {result.post_url && (
                  <a
                    href={result.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-pink-500"
                  >
                    <ExternalLink className="w-3 h-3" /> Gönderiyi Görüntüle
                  </a>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                  <a
                    href={result.profile_url || `https://instagram.com/${result.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-pink-500 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" /> Profil
                  </a>

                  <div className="ml-auto flex gap-1.5">
                    {/* KOL olarak ekle */}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isKolAdded || isAddingKol}
                      onClick={() => handleAddKol(result)}
                      className="h-7 text-xs border-pink-200 text-pink-600 hover:bg-pink-50"
                    >
                      {isAddingKol ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isKolAdded ? (
                        <><Check className="w-3 h-3" /> KOL</>
                      ) : (
                        <><Star className="w-3 h-3" /> KOL Ekle</>
                      )}
                    </Button>

                    {/* Lead olarak ekle */}
                    <Button
                      size="sm"
                      variant={isAdded ? "outline" : "default"}
                      disabled={isAdded || isAddingLead}
                      onClick={() => handleAddLead(result)}
                      className={`h-7 text-xs ${!isAdded ? "bg-green-600 hover:bg-green-700" : ""}`}
                    >
                      {isAddingLead ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : isAdded ? (
                        <><Check className="w-3 h-3" /> Eklendi</>
                      ) : (
                        <><Plus className="w-3 h-3" /> Aday</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link to KOL page */}
      {addedKolIds.size > 0 && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-pink-800 text-sm">{addedKolIds.size} kişi KOL listesine eklendi</p>
            <p className="text-xs text-pink-600">Temas sürecini KOL Takip sayfasından yönetin</p>
          </div>
          <Button asChild size="sm" className="bg-pink-500 hover:bg-pink-600">
            <Link href="/musteri-adayi/kol-takip">
              <Users className="w-4 h-4" /> KOL Takip
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
