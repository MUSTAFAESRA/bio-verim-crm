"use client";

import { useState, useEffect } from "react";
import { Phone, Sparkles, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallPrepPanelProps {
  customerId: string;
  customerName: string;
  stepNo: number;
  stepTemplate: string;
  seqName: string;
}

interface CallScript {
  greeting: string;
  mainPoints: string[];
  keyQuestion: string;
  objections: { objection: string; response: string }[];
  closing: string;
  tone: string;
  estimatedDuration: string;
  source: string;
  historyNote?: string | null;
  logCount?: number;
}

const TONE_STYLES: Record<string, { label: string; color: string }> = {
  sıcak: { label: "Sıcak & Samimi", color: "bg-green-100 text-green-700" },
  nötr: { label: "Nötr & Profesyonel", color: "bg-blue-100 text-blue-700" },
  takip: { label: "Takip", color: "bg-amber-100 text-amber-700" },
  agresif: { label: "Aktif Satış", color: "bg-red-100 text-red-700" },
};

export function CallPrepPanel({ customerId, customerName, stepNo, stepTemplate, seqName }: CallPrepPanelProps) {
  const [script, setScript] = useState<CallScript | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>("mainPoints");

  // Sayfa yüklenince otomatik script üret (ajan davranışı)
  useEffect(() => {
    generateScript();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateScript = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/call-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, customerName, stepNo, stepTemplate, seqName }),
      });
      if (!res.ok) throw new Error("Script üretilemedi");
      const data = await res.json();
      setScript(data);
    } catch (e) {
      setError("Script üretilirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const tone = script ? (TONE_STYLES[script.tone] ?? { label: script.tone, color: "bg-slate-100 text-slate-600" }) : null;

  return (
    <div className="rounded-xl border-2 border-blue-200 bg-blue-50 overflow-hidden">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <Phone className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Yapay Zeka Çağrı Scripti</p>
            <p className="text-xs text-slate-500">Geçmiş temaslar analiz edilerek kişiselleştirilir</p>
          </div>
        </div>
        <Button
          size="sm"
          variant={script ? "outline" : "default"}
          className="gap-2"
          onClick={generateScript}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          {loading ? "Hazırlanıyor..." : script ? "Yenile" : "Script Üret"}
        </Button>
      </div>

      {error && (
        <div className="mx-4 mb-4 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg p-3 border border-red-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {!script && !loading && (
        <div className="px-4 pb-4 text-center">
          <p className="text-xs text-slate-400">
            Butona tıklayın — müşterinin temas geçmişi analiz edilerek size özel bir çağrı scripti oluşturulur.
          </p>
        </div>
      )}

      {script && (
        <div className="px-4 pb-4 space-y-3">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            {tone && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tone.color}`}>
                {tone.label}
              </span>
            )}
            <span className="text-xs text-slate-400">⏱ {script.estimatedDuration}</span>
            {script.logCount !== undefined && (
              <span className="text-xs text-slate-400">📋 {script.logCount} geçmiş temas analiz edildi</span>
            )}
            {script.source === "ai" && (
              <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">✨ AI</span>
            )}
          </div>

          {/* Açılış */}
          <div className="bg-white rounded-lg p-3 border border-blue-100">
            <p className="text-xs font-semibold text-slate-500 mb-1.5">📞 AÇILIŞ</p>
            <p className="text-sm text-slate-700 italic">&quot;{script.greeting}&quot;</p>
          </div>

          {/* Ana Konular */}
          <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-3 text-left"
              onClick={() => setExpanded(expanded === "mainPoints" ? null : "mainPoints")}
            >
              <p className="text-xs font-semibold text-slate-600">🎯 ANA KONULAR</p>
              {expanded === "mainPoints" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expanded === "mainPoints" && (
              <div className="px-3 pb-3 space-y-1.5">
                {(script.mainPoints ?? []).map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                    {p}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kritik Soru */}
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-xs font-semibold text-amber-600 mb-1">❓ KRİTİK SORU</p>
            <p className="text-sm text-slate-700 italic">&quot;{script.keyQuestion}&quot;</p>
          </div>

          {/* İtirazlar */}
          {script.objections?.length > 0 && (
            <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-3 text-left"
                onClick={() => setExpanded(expanded === "objections" ? null : "objections")}
              >
                <p className="text-xs font-semibold text-slate-600">🛡 İTİRAZ YÖNETİMİ</p>
                {expanded === "objections" ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {expanded === "objections" && (
                <div className="px-3 pb-3 space-y-2">
                  {script.objections.map((o, i) => (
                    <div key={i} className="text-xs rounded-lg overflow-hidden border border-slate-100">
                      <div className="bg-red-50 px-3 py-1.5 font-medium text-red-700">
                        — {o.objection}
                      </div>
                      <div className="bg-green-50 px-3 py-1.5 text-green-700">
                        ✓ {o.response}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Kapanış */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <p className="text-xs font-semibold text-green-600 mb-1">🎬 KAPANIŞ</p>
            <p className="text-sm text-slate-700">{script.closing}</p>
          </div>
        </div>
      )}
    </div>
  );
}
