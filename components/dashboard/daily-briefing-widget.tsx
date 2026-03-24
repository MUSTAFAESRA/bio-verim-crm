"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Brain, Phone, MessageCircle, Mail, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UrgentContact {
  customerId: string;
  name: string;
  reason: string;
  suggestedAction: string;
  channel: string;
  urgencyLevel: "high" | "medium" | "low";
}

interface BriefingData {
  urgentContacts: UrgentContact[];
  insights: string;
  todaysPriority: string;
  source: "gemini" | "mock";
  generatedAt: string;
}

const URGENCY_CONFIG = {
  high: { label: "Acil", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  medium: { label: "Orta", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
  low: { label: "Düşük", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
};

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  call: <Phone className="w-3.5 h-3.5" />,
  whatsapp: <MessageCircle className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
};

const CHANNEL_LABEL: Record<string, string> = {
  call: "Ara",
  whatsapp: "WhatsApp",
  email: "E-posta",
};

export function DailyBriefingWidget() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/daily-briefing", { method: "POST" });
      if (!res.ok) throw new Error("Briefing alınamadı");
      const data = await res.json();
      setBriefing(data);
    } catch (e) {
      setError("AI briefing yüklenemedi.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  const formattedTime = briefing?.generatedAt
    ? new Date(briefing.generatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-purple-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-600">
        <div className="flex items-center gap-2 text-white">
          <Brain className="w-4 h-4" />
          <span className="text-sm font-semibold">AI Günlük Briefing</span>
          {briefing?.source === "gemini" && (
            <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">✨ Gemini</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {formattedTime && (
            <span className="text-xs text-purple-200">{formattedTime}</span>
          )}
          <button
            onClick={fetchBriefing}
            disabled={loading}
            className="text-white hover:text-purple-200 transition-colors disabled:opacity-50"
            title="Yenile"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-white hover:text-purple-200 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-purple-500">
              <RefreshCw className="w-4 h-4 animate-spin" />
              AI analiz yapıyor...
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {briefing && !loading && (
            <>
              {/* Bugünün Önceliği */}
              <div className="bg-purple-100 border border-purple-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-purple-600 mb-1">🎯 BUGÜNÜN ÖNCELİĞİ</p>
                <p className="text-sm text-purple-800 font-medium">{briefing.todaysPriority}</p>
              </div>

              {/* Genel Değerlendirme */}
              <div className="bg-white/70 rounded-lg px-3 py-2.5 text-sm text-slate-600 italic border border-purple-100">
                {briefing.insights}
              </div>

              {/* Acil Müşteriler */}
              {briefing.urgentContacts?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Öncelikli Müşteriler
                  </p>
                  {briefing.urgentContacts.map((contact, i) => {
                    const urg = URGENCY_CONFIG[contact.urgencyLevel] ?? URGENCY_CONFIG.medium;
                    return (
                      <div
                        key={i}
                        className="bg-white rounded-lg border border-purple-100 px-3 py-2.5 flex items-start gap-3"
                      >
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${urg.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800">
                              {contact.name}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${urg.bg} ${urg.text}`}>
                              {urg.label}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              {CHANNEL_ICON[contact.channel]}
                              {CHANNEL_LABEL[contact.channel] ?? contact.channel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{contact.reason}</p>
                          <p className="text-xs text-slate-700 mt-1 font-medium">
                            → {contact.suggestedAction}
                          </p>
                        </div>
                        {contact.customerId && (
                          <Link
                            href={`/musteriler/${contact.customerId}`}
                            className="text-xs text-purple-600 hover:text-purple-800 flex-shrink-0 mt-0.5"
                          >
                            Görüntüle →
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {briefing.urgentContacts?.length === 0 && (
                <div className="text-center py-4 text-sm text-slate-400">
                  🎉 Bugün acil bekleyen müşteri yok!
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
