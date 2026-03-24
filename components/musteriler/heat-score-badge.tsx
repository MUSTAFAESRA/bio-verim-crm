"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface HeatScoreBadgeProps {
  customerId: string;
  customerName?: string;
  /** Varsa customer.notes'tan parse edilmiş cache */
  cachedScore?: {
    score: number;
    label: "Sıcak" | "Ilık" | "Soğuk";
    color: "red" | "orange" | "blue";
    reasoning: string;
    cachedAt: string;
  } | null;
}

const SCORE_CONFIG = {
  Sıcak: {
    emoji: "🔥",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    tooltip: "Satın alma yakın veya aktif ilgi var",
  },
  Ilık: {
    emoji: "🌤",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    tooltip: "Potansiyel var, takip gerekli",
  },
  Soğuk: {
    emoji: "❄️",
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    tooltip: "Düşük ilgi veya uzun süre sessiz",
  },
};

export function HeatScoreBadge({ customerId, customerName, cachedScore }: HeatScoreBadgeProps) {
  const [score, setScore] = useState(cachedScore ?? null);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchScore = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const res = await fetch("/api/ai/customer-heat-score", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerId, customerName }),
      });
      const data = await res.json();
      setScore(data);
    } catch {
      // sessizce hata
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400 px-1.5 py-0.5">
        <Loader2 className="w-3 h-3 animate-spin" />
        Analiz...
      </span>
    );
  }

  if (!score) {
    return (
      <button
        onClick={fetchScore}
        className="text-xs text-slate-400 hover:text-purple-600 transition-colors px-1 py-0.5 rounded hover:bg-purple-50"
        title="AI sıcaklık skoru hesapla"
      >
        🌡 Skor Al
      </button>
    );
  }

  const cfg = SCORE_CONFIG[score.label] ?? SCORE_CONFIG["Ilık"];

  return (
    <div className="relative inline-block">
      <button
        onClick={fetchScore}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} cursor-pointer hover:opacity-80 transition-opacity`}
        title={score.reasoning}
      >
        {cfg.emoji} {score.label} {score.score}/10
      </button>

      {/* Tooltip */}
      {showTooltip && score.reasoning && (
        <div className="absolute bottom-full left-0 mb-1 z-50 w-56 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg">
          {score.reasoning}
          <div className="absolute top-full left-3 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

/** customer.notes alanından HEAT_SCORE cache'ini parse eder */
export function parseHeatScoreFromNotes(notes: string | null | undefined) {
  if (!notes) return null;
  const match = notes.match(/\[HEAT_SCORE:([\s\S]*?)\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as {
      score: number;
      label: "Sıcak" | "Ilık" | "Soğuk";
      color: "red" | "orange" | "blue";
      reasoning: string;
      cachedAt: string;
    };
  } catch {
    return null;
  }
}
