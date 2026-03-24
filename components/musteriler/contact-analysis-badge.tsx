"use client";

import { useState } from "react";
import { Loader2, Brain } from "lucide-react";
import type { ContactAnalysis } from "@/app/api/ai/analyze-contact/route";

interface ContactAnalysisBadgeProps {
  contactLogId: string;
  customerId: string;
}

const SENTIMENT_CONFIG = {
  positive: { emoji: "😊", bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  neutral: { emoji: "😐", bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" },
  negative: { emoji: "😟", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

export function ContactAnalysisBadge({ contactLogId, customerId }: ContactAnalysisBadgeProps) {
  const [analysis, setAnalysis] = useState<ContactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchAnalysis = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (analysis) {
      setExpanded((v) => !v);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/analyze-contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactLogId, customerId }),
      });
      const data = await res.json();
      setAnalysis(data);
      setExpanded(true);
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

  if (!analysis) {
    return (
      <button
        onClick={fetchAnalysis}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-purple-600 transition-colors px-1.5 py-0.5 rounded hover:bg-purple-50"
        title="AI ile bu teması analiz et"
      >
        <Brain className="w-3 h-3" />
        AI Analiz
      </button>
    );
  }

  const cfg = SENTIMENT_CONFIG[analysis.sentiment] ?? SENTIMENT_CONFIG.neutral;

  return (
    <div className="mt-2">
      {/* Özet satır */}
      <button
        onClick={fetchAnalysis}
        className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80 transition-opacity`}
      >
        <Brain className="w-3 h-3" />
        {cfg.emoji} {analysis.sentimentLabel} · {analysis.interestScore}/10
        {analysis.tags.length > 0 && (
          <span className="ml-1 opacity-70">· {analysis.tags[0]}</span>
        )}
        <span className="ml-1 text-[10px] opacity-50">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* Detay paneli */}
      {expanded && (
        <div className={`mt-1.5 p-2.5 rounded-lg border text-xs ${cfg.bg} ${cfg.border} space-y-1.5`}>
          {/* Insight */}
          <p className={`${cfg.text} leading-snug`}>
            <span className="font-medium">💡 Insight: </span>
            {analysis.insight}
          </p>

          {/* Next suggestion */}
          {analysis.nextSuggestion && (
            <p className="text-slate-600 leading-snug">
              <span className="font-medium">→ Sonraki Adım: </span>
              {analysis.nextSuggestion}
            </p>
          )}

          {/* Tags */}
          {analysis.tags.length > 1 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {analysis.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-white/70 border border-current/20 px-1.5 py-0.5 rounded-full text-[10px] opacity-80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {analysis.source === "gemini" && (
            <p className="text-[10px] text-slate-400">✨ Gemini AI</p>
          )}
        </div>
      )}
    </div>
  );
}
