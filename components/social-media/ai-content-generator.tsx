"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type Platform = "facebook" | "instagram" | "linkedin";
type Tone = "profesyonel" | "samimi" | "heyecanlı" | "bilgilendirici" | "kampanya";

const TONES: { value: Tone; label: string }[] = [
  { value: "profesyonel", label: "💼 Profesyonel" },
  { value: "samimi", label: "😊 Samimi" },
  { value: "heyecanlı", label: "🔥 Heyecanlı" },
  { value: "bilgilendirici", label: "📚 Bilgilendirici" },
  { value: "kampanya", label: "🎯 Kampanya" },
];

const TOPIC_PRESETS = [
  "Ürün tanıtımı", "Gübre kampanyası", "Tarım sezonu", "Müşteri başarı hikayesi",
  "Çevre dostu tarım", "Organik ürünler", "Verim artırma ipuçları", "Sektör haberleri",
];

interface Props {
  platform: Platform;
  onUseContent: (content: string) => void;
}

export default function AiContentGenerator({ platform, onUseContent }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<Tone>("profesyonel");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const platformLabels: Record<Platform, string> = {
    linkedin: "LinkedIn (3000 karakter, profesyonel ağ)",
    facebook: "Facebook (etkileşim odaklı, emoji kullan)",
    instagram: "Instagram (caption + hashtag, 2200 karakter)",
  };

  const handleGenerate = async () => {
    if (!topic.trim()) { setError("Konu/anahtar kelime gir."); return; }
    setLoading(true);
    setError(null);
    setGenerated("");

    try {
      const res = await fetch("/api/social/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, platform }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Üretim başarısız."); return; }
      setGenerated(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    onUseContent(generated);
    setOpen(false);
  };

  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl overflow-hidden">
      {/* Header — tıklanabilir */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-violet-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-violet-800">AI İçerik Üretici</span>
          <span className="text-[10px] bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">ÜCRETSİZ</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4 text-violet-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-violet-100">
          <p className="text-[11px] text-violet-600 pt-3">
            🤖 Gemini AI ile {platformLabels[platform]} için içerik üret
          </p>

          {/* Konu */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Konu / Anahtar Kelime</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="örn. Gübre kampanyası, tarım sezonu..."
              className="w-full h-9 px-3 rounded-lg border border-violet-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="flex flex-wrap gap-1 mt-1">
              {TOPIC_PRESETS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    topic === t ? "bg-violet-500 text-white border-violet-500" : "border-violet-200 text-violet-600 hover:border-violet-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Ton */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Ton</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setTone(value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    tone === value ? "bg-violet-500 text-white border-violet-500" : "border-violet-200 text-violet-700 hover:border-violet-400 bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Üret butonu */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="bg-violet-600 hover:bg-violet-700 text-white h-9 w-full"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Üretiliyor...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> İçerik Üret</>
            )}
          </Button>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

          {/* Üretilen içerik */}
          {generated && (
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={generated}
                  onChange={(e) => setGenerated(e.target.value)}
                  rows={6}
                  className="w-full resize-none rounded-lg border border-violet-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  className="border-violet-200 text-violet-700 hover:bg-violet-50 h-8 text-xs flex-1"
                >
                  <RefreshCw className="w-3 h-3" /> Yeniden Üret
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="border-violet-200 text-violet-700 hover:bg-violet-50 h-8 text-xs"
                >
                  {copied ? <><Check className="w-3 h-3" /> Kopyalandı</> : <><Copy className="w-3 h-3" /> Kopyala</>}
                </Button>
                <Button
                  size="sm"
                  onClick={handleUse}
                  className="bg-violet-600 hover:bg-violet-700 text-white h-8 text-xs flex-1"
                >
                  ✓ Kullan
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
