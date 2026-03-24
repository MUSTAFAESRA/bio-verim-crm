"use client";

import { useState, useEffect, useTransition } from "react";
import { Sparkles, Copy, CheckCheck, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceStep } from "@/actions/contact-sequences";
import { useRouter } from "next/navigation";

interface SocialPanelProps {
  customerId: string;
  customerName: string;
  channel: "instagram" | "linkedin_dm" | "facebook_dm";
  stepTemplate: string;
  stepNo: number;
  seqName: string;
  customerSequenceId: string;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}

const CHANNEL_CONFIG = {
  instagram: {
    label: "Instagram DM",
    icon: "📸",
    color: "bg-pink-600",
    border: "border-pink-200",
    bg: "bg-pink-50",
    tabColor: "text-pink-700 border-pink-500",
    isLinkedIn: false,
  },
  linkedin_dm: {
    label: "LinkedIn DM",
    icon: "💼",
    color: "bg-blue-700",
    border: "border-blue-200",
    bg: "bg-blue-50",
    tabColor: "text-blue-700 border-blue-600",
    isLinkedIn: true,
  },
  facebook_dm: {
    label: "Facebook Mesaj",
    icon: "📘",
    color: "bg-indigo-600",
    border: "border-indigo-200",
    bg: "bg-indigo-50",
    tabColor: "text-indigo-700 border-indigo-500",
    isLinkedIn: false,
  },
};

function buildProfileLink(
  channel: SocialPanelProps["channel"],
  linkedinUrl?: string | null,
  instagramUrl?: string | null,
  facebookUrl?: string | null,
  message?: string
): string | null {
  if (channel === "instagram" && instagramUrl) {
    const handle = instagramUrl.replace(/^@/, "").replace(/.*instagram\.com\//, "");
    return `https://www.instagram.com/${handle}/`;
  }
  if (channel === "linkedin_dm" && linkedinUrl) {
    const url = linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`;
    return url;
  }
  if (channel === "facebook_dm" && facebookUrl) {
    const page = facebookUrl.replace(/.*facebook\.com\//, "").replace(/\/$/, "");
    if (message) return `https://m.me/${page}?text=${encodeURIComponent(message)}`;
    return `https://www.facebook.com/${page}`;
  }
  return null;
}

export function SocialPanel({
  customerId,
  customerName,
  channel,
  stepTemplate,
  stepNo,
  seqName,
  customerSequenceId,
  linkedinUrl,
  instagramUrl,
  facebookUrl,
}: SocialPanelProps) {
  const [activeTab, setActiveTab] = useState<"send" | "reply">("send");
  const [incomingMsg, setIncomingMsg] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // LinkedIn: AI mesaj otomatik üret
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [loadingAiMsg, setLoadingAiMsg] = useState(false);
  const [linkedInSent, setLinkedInSent] = useState(false);

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const cfg = CHANNEL_CONFIG[channel];
  const isLinkedIn = cfg.isLinkedIn;

  const preparedMessage = stepTemplate
    .replace(/\{\{musteri_adi\}\}/g, customerName)
    .replace(/\{\{urun_adi\}\}/g, "Bio Verim Sıvı Gübre")
    .replace(/\{\{tarih\}\}/g, new Date().toLocaleDateString("tr-TR"))
    .replace(/\{\{fiyat\}\}/g, "fiyat için iletişime geçin");

  const displayMessage = aiMessage ?? preparedMessage;
  const profileLink = buildProfileLink(channel, linkedinUrl, instagramUrl, facebookUrl, displayMessage);

  // LinkedIn: sayfa yüklenince AI mesaj otomatik üret
  useEffect(() => {
    if (!isLinkedIn) return;
    setLoadingAiMsg(true);
    fetch("/api/ai/personalize-step", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        customerId,
        customerName,
        stepTemplate: preparedMessage,
        stepNo,
        seqName,
        channel: "linkedin_dm",
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.personalizedMessage) setAiMessage(d.personalizedMessage);
      })
      .catch(() => {})
      .finally(() => setLoadingAiMsg(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLinkedIn]);

  const handleCopy = async (text: string, type: "msg" | "reply") => {
    await navigator.clipboard.writeText(text);
    if (type === "msg") {
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2000);
    } else {
      setCopiedReply(true);
      setTimeout(() => setCopiedReply(false), 2000);
    }
  };

  // LinkedIn: kopyala + profil aç — tek buton
  const handleLinkedInSend = async () => {
    await navigator.clipboard.writeText(displayMessage);
    setLinkedInSent(true);
    if (profileLink) window.open(profileLink, "_blank");
  };

  // LinkedIn: gönderimi onayla → sekans ilerler
  const handleLinkedInConfirm = () => {
    startTransition(async () => {
      await advanceStep(customerSequenceId);
      setConfirmed(true);
      router.refresh();
    });
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
          phone: null,
          incomingMessage: incomingMsg,
          autoSend: false,
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
    <div className={`${cfg.bg} ${cfg.border} border rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${cfg.color} text-white`}>
        <span>{cfg.icon}</span>
        <span className="text-sm font-semibold">
          {cfg.label} — Adım {stepNo}
        </span>
        <span className="ml-auto text-xs opacity-75">{customerName}</span>
        {isLinkedIn && (
          <span className="text-xs bg-white/20 rounded px-1.5 py-0.5">
            ⚡ AI Destekli
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        <button
          onClick={() => setActiveTab("send")}
          className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activeTab === "send"
              ? `bg-white border-b-2 ${cfg.tabColor}`
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          📤 Mesaj Gönder
        </button>
        <button
          onClick={() => setActiveTab("reply")}
          className={`flex-1 text-xs py-2 font-medium transition-colors ${
            activeTab === "reply"
              ? `bg-white border-b-2 ${cfg.tabColor}`
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          🤖 AI Yanıt Üret
        </button>
      </div>

      <div className="p-4 bg-white">
        {activeTab === "send" ? (
          <div className="space-y-3">
            {/* Mesaj kutusu */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-slate-500">
                  {isLinkedIn ? "🤖 AI kişiselleştirilmiş mesaj:" : "Gönderilecek mesaj:"}
                </p>
                {isLinkedIn && loadingAiMsg && (
                  <span className="text-xs text-blue-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    AI hazırlıyor...
                  </span>
                )}
                {isLinkedIn && aiMessage && !loadingAiMsg && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Kişiselleştirildi
                  </span>
                )}
              </div>

              {isLinkedIn ? (
                <textarea
                  value={loadingAiMsg ? "AI mesaj hazırlıyor..." : displayMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  disabled={loadingAiMsg}
                  rows={5}
                  className={`w-full text-sm border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${cfg.border} ${cfg.bg}`}
                />
              ) : (
                <div
                  className={`${cfg.bg} ${cfg.border} border rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap`}
                >
                  {displayMessage}
                </div>
              )}
            </div>

            {/* Butonlar */}
            {isLinkedIn ? (
              <div className="space-y-2">
                {confirmed ? (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Gönderim onaylandı — sekans ilerletildi
                  </div>
                ) : (
                  <>
                    {/* Adım 1: Kopyala + Profil Aç */}
                    {profileLink ? (
                      <Button
                        size="sm"
                        className={`w-full gap-1.5 text-xs ${cfg.color} hover:opacity-90`}
                        onClick={handleLinkedInSend}
                        disabled={loadingAiMsg}
                      >
                        {linkedInSent ? (
                          <CheckCheck className="w-3.5 h-3.5" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5" />
                        )}
                        {linkedInSent
                          ? "✅ Mesaj kopyalandı — LinkedIn'de yapıştırın"
                          : "1. Kopyala + LinkedIn'i Aç"}
                      </Button>
                    ) : (
                      <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        ⚠️ Müşteri kartına LinkedIn profil URL'si ekleyin
                      </div>
                    )}

                    {/* Adım 2: Onayla (sadece kopyalandıktan sonra aktif) */}
                    <Button
                      size="sm"
                      variant={linkedInSent ? "default" : "outline"}
                      className="w-full gap-1.5 text-xs"
                      onClick={handleLinkedInConfirm}
                      disabled={!linkedInSent || isPending}
                    >
                      {isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      2. Gönderdim, Onayla → Sekans İlerlet
                    </Button>

                    <p className="text-xs text-slate-400">
                      💡 LinkedIn'de &quot;Mesaj&quot; → Ctrl+V → Gönder → Yukarıda onayla
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Instagram / Facebook butonları */
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => handleCopy(displayMessage, "msg")}
                >
                  {copiedMsg ? (
                    <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedMsg ? "Kopyalandı" : "Kopyala"}
                </Button>

                {profileLink ? (
                  <a href={profileLink} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="sm"
                      className={`gap-1.5 text-xs ${cfg.color} hover:opacity-90`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {channel === "facebook_dm"
                        ? "Messenger'da Aç"
                        : "Instagram'da Aç"}
                    </Button>
                  </a>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
                    ⚠️ Müşteri kartına{" "}
                    {channel === "instagram" ? "Instagram" : "Facebook"} profili ekleyin
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* AI Yanıt Sekmesi */
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                {cfg.label}&apos;dan gelen mesajı girin:
              </label>
              <textarea
                value={incomingMsg}
                onChange={(e) => setIncomingMsg(e.target.value)}
                placeholder="Müşterinin gönderdiği mesajı buraya yazın..."
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <Button
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleGetAiReply}
              disabled={loadingReply || !incomingMsg.trim()}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loadingReply ? "AI yanıt üretiyor..." : "AI Yanıt Önerisi Al"}
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
                    onClick={() => handleCopy(aiReply, "reply")}
                  >
                    {copiedReply ? (
                      <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    Kopyala
                  </Button>
                  {profileLink && (
                    <a href={profileLink} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="sm"
                        className={`gap-1.5 text-xs ${cfg.color} hover:opacity-90`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Profili Aç
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
