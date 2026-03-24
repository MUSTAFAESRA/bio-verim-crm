"use client";

import { useState } from "react";
import { MessageCircle, Send, Sparkles, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneForWhatsApp } from "@/lib/whatsapp";

interface WhatsAppPanelProps {
  customerId: string;
  customerName: string;
  phone: string | null;
  stepTemplate: string;
  stepNo: number;
  seqName: string;
}

export function WhatsAppPanel({
  customerId, customerName, phone, stepTemplate, stepNo, seqName
}: WhatsAppPanelProps) {
  const [incomingMsg, setIncomingMsg] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "reply">("send");

  // Şablon mesajı hazırla
  const preparedMessage = stepTemplate
    .replace(/\{\{musteri_adi\}\}/g, customerName)
    .replace(/\{\{urun_adi\}\}/g, "Bio Verim Sıvı Gübre")
    .replace(/\{\{tarih\}\}/g, new Date().toLocaleDateString("tr-TR"))
    .replace(/\{\{fiyat\}\}/g, "fiyat bilgisi için arayın");

  const waPhone = phone ? formatPhoneForWhatsApp(phone) : "";
  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(preparedMessage)}`;

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGetAiReply = async () => {
    if (!incomingMsg.trim()) return;
    setLoadingReply(true);
    setAiReply("");
    try {
      const res = await fetch("/api/whatsapp/ai-reply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId,
          customerName,
          phone,
          incomingMessage: incomingMsg,
          autoSend: false, // Sadece öneri — manuel gönderim
        }),
      });
      const data = await res.json();
      setAiReply(data.reply ?? "");
    } catch {
      setAiReply("Yanıt üretilemedi.");
    }
    setLoadingReply(false);
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white">
        <MessageCircle className="w-4 h-4" />
        <span className="text-sm font-semibold">WhatsApp — Adım {stepNo}</span>
        {phone && (
          <span className="text-xs text-green-200 ml-auto">{phone}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-green-200">
        <button
          onClick={() => setActiveTab("send")}
          className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activeTab === "send"
              ? "bg-white text-green-700 border-b-2 border-green-600"
              : "text-green-600 hover:bg-green-100"
          }`}
        >
          📤 Gönder
        </button>
        <button
          onClick={() => setActiveTab("reply")}
          className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activeTab === "reply"
              ? "bg-white text-green-700 border-b-2 border-green-600"
              : "text-green-600 hover:bg-green-100"
          }`}
        >
          🤖 AI Yanıt Üret
        </button>
      </div>

      <div className="p-4 bg-white">
        {activeTab === "send" ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-1">Gönderilecek mesaj (şablondan):</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                {preparedMessage}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => handleCopy(preparedMessage)}
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Kopyalandı" : "Kopyala"}
              </Button>

              {phone ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700">
                    <ExternalLink className="w-3.5 h-3.5" />
                    WhatsApp'ta Aç
                  </Button>
                </a>
              ) : (
                <Button size="sm" disabled className="gap-1.5 text-xs">
                  Telefon numarası yok
                </Button>
              )}
            </div>

            {!phone && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                ⚠️ Bu müşteri için telefon numarası girilmemiş. Müşteri kartından ekleyin.
              </p>
            )}

            <p className="text-xs text-slate-400">
              💡 Meta WhatsApp API bağlandığında mesajlar otomatik gönderilir.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Müşteriden gelen mesajı buraya girin:
              </label>
              <textarea
                value={incomingMsg}
                onChange={e => setIncomingMsg(e.target.value)}
                placeholder="Örn: Fiyatlarınız nedir? Numune gönderir misiniz?"
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleGetAiReply}
              disabled={loadingReply || !incomingMsg.trim()}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingReply ? "AI yanıt üretiyor..." : "AI Yanıt Üret (Gemini)"}
            </Button>

            {aiReply && (
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {aiReply}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs"
                    onClick={() => handleCopy(aiReply)}
                  >
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    Kopyala
                  </Button>
                  {phone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(aiReply)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700">
                        <Send className="w-3.5 h-3.5" />
                        WhatsApp'ta Gönder
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
