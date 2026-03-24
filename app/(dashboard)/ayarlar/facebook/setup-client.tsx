"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Circle, ExternalLink, Copy, Check,
  Loader2, RefreshCw, Wifi, WifiOff, Eye, EyeOff,
} from "lucide-react";

interface Props {
  pageTokenConfigured: boolean;
  pageIdConfigured: boolean;
  pageId: string;
  instagramConfigured: boolean;
  verifyToken: string;
  webhookUrl: string;
  facebookAutoReply: boolean;
  instagramAutoReply: boolean;
}

export function FacebookSetupClient({
  pageTokenConfigured: initialTokenOk,
  pageIdConfigured: initialPageIdOk,
  pageId: initialPageId,
  instagramConfigured: initialIgOk,
  verifyToken,
  webhookUrl: initialWebhookUrl,
  facebookAutoReply: initialFbAutoReply,
  instagramAutoReply: initialIgAutoReply,
}: Props) {
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [pageId, setPageId] = useState("");
  const [instagramAccountId, setInstagramAccountId] = useState("");
  const [webhookPublicUrl, setWebhookPublicUrl] = useState("");
  const [fbAutoReply, setFbAutoReply] = useState(initialFbAutoReply);
  const [igAutoReply, setIgAutoReply] = useState(initialIgAutoReply);
  const [showToken, setShowToken] = useState(false);

  const [tokenOk, setTokenOk] = useState(initialTokenOk);
  const [pageIdOk, setPageIdOk] = useState(initialPageIdOk);
  const [igOk, setIgOk] = useState(initialIgOk);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean; pageName?: string; error?: string;
  } | null>(null);

  const [copied, setCopied] = useState<string | null>(null);

  const fbWebhookUrl = webhookPublicUrl
    ? `${webhookPublicUrl.replace(/\/$/, "")}/api/webhooks/facebook-messenger`
    : initialWebhookUrl.replace("/api/webhooks/whatsapp", "/api/webhooks/facebook-messenger");

  const igWebhookUrl = webhookPublicUrl
    ? `${webhookPublicUrl.replace(/\/$/, "")}/api/webhooks/instagram`
    : initialWebhookUrl.replace("/api/webhooks/whatsapp", "/api/webhooks/instagram");

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (!pageAccessToken && !pageId && !instagramAccountId && !webhookPublicUrl) {
      setSaveResult({ ok: false, msg: "En az bir alan doldurun" });
      return;
    }
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/settings/facebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          pageAccessToken: pageAccessToken || undefined,
          pageId: pageId || undefined,
          instagramBusinessAccountId: instagramAccountId || undefined,
          webhookUrl: webhookPublicUrl || undefined,
          facebookAutoReply: fbAutoReply,
          instagramAutoReply: igAutoReply,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveResult({ ok: true, msg: "✅ Kaydedildi! Sunucu yeniden başlatılıyor..." });
        if (pageAccessToken) setTokenOk(true);
        if (pageId) setPageIdOk(true);
        if (instagramAccountId) setIgOk(true);
        setTimeout(async () => {
          await fetch("/api/settings/facebook", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "restart" }),
          });
        }, 500);
      } else {
        setSaveResult({ ok: false, msg: data.error ?? "Kayıt başarısız" });
      }
    } catch {
      setSaveResult({ ok: false, msg: "Bağlantı hatası" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/facebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "test",
          pageAccessToken: pageAccessToken || undefined,
          pageId: pageId || undefined,
        }),
      });
      const data = await res.json();
      setTestResult({ ok: data.success, pageName: data.pageName, error: data.error });
    } catch {
      setTestResult({ ok: false, error: "Bağlantı hatası" });
    } finally {
      setTesting(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await fetch("/api/settings/facebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      setTimeout(() => setRestarting(false), 3000);
    } catch {
      setRestarting(false);
    }
  };

  const allConfigured = tokenOk && pageIdOk;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📘 Facebook Messenger & Instagram DM</h1>
          <p className="text-slate-500 text-sm mt-1">Meta Business API — Gelen mesajlara otomatik AI yanıt</p>
        </div>
        <Badge variant={allConfigured ? "success" : "warning"} className="text-sm px-3 py-1">
          {allConfigured ? (
            <><Wifi className="w-3.5 h-3.5 mr-1" /> Bağlı</>
          ) : (
            <><WifiOff className="w-3.5 h-3.5 mr-1" /> Bağlı Değil</>
          )}
        </Badge>
      </div>

      {/* Durum Kartı */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Page Token", ok: tokenOk },
          { label: "Page ID", ok: pageIdOk },
          { label: "Instagram Hesabı", ok: igOk },
          { label: "Facebook AI Yanıt", ok: fbAutoReply, blue: true },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-xl p-3 text-xs font-medium border ${
              item.ok
                ? item.blue
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-green-50 text-green-700 border-green-200"
                : "bg-slate-50 text-slate-500 border-slate-200"
            }`}
          >
            {item.ok ? "✅" : "⭕"} {item.label}
          </div>
        ))}
      </div>

      {/* ── ADIM 1: Meta Business Suite ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Meta Business Suite — Sayfa Erişim Token Alın
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="space-y-2">
            {[
              { text: "Meta Business Suite → business.facebook.com → giriş yap", link: "https://business.facebook.com" },
              { text: "Sol menü → Ayarlar → İş Entegrasyonları → Uygulama Ekle" },
              { text: "Veya Meta Developers → developers.facebook.com → Uygulama Oluştur → Business seç", link: "https://developers.facebook.com/apps" },
              { text: "Uygulamaya Messenger ürünü ekle → Facebook Sayfanızı bağlayın" },
              { text: "Messenger → API Kurulumu → Access Tokens → Token oluştur" },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <Circle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />
                <span>
                  {step.text}
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer"
                      className="ml-1 text-blue-500 hover:underline inline-flex items-center gap-0.5">
                      <ExternalLink className="w-3 h-3" /> Aç
                    </a>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            💡 Instagram DM için: Instagram hesabını Facebook sayfanıza bağlayın. Aynı Page Token ve Page ID ile çalışır.
          </div>
        </CardContent>
      </Card>

      {/* ── ADIM 2: API Bilgileri ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
            API Bilgilerini Gir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            📍 Meta Developers → Uygulamanız → Messenger → API Kurulumu sayfasında token ve Page ID bulunur.
          </div>

          {/* Page Access Token */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Page Access Token
              {tokenOk && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                placeholder={tokenOk ? "••••••• (kaydedildi)" : "EAAG..."}
                value={pageAccessToken}
                onChange={(e) => setPageAccessToken(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => setShowToken(!showToken)}
                className="px-2 py-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Page ID */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Facebook Page ID
              {pageIdOk && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </label>
            <input
              type="text"
              placeholder={pageIdOk ? `(kaydedildi: ${initialPageId || "..."})` : "123456789012345"}
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400">Sayfanızın Hakkında bölümünde veya Meta Developers → Messenger → API Kurulumu'nda bulunur.</p>
          </div>

          {/* Instagram Business Account ID */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Instagram Business Account ID
              {igOk && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </label>
            <input
              type="text"
              placeholder={igOk ? "(kaydedildi)" : "17841400000000000"}
              value={instagramAccountId}
              onChange={(e) => setInstagramAccountId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400">Meta Developers → Instagram → API Kurulumu'nda bulunur. Instagram sayfayı Facebook sayfasına bağladıktan sonra görünür.</p>
          </div>

          {/* AI Auto-Reply Toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">🤖 Facebook Messenger AI Yanıt</p>
                <p className="text-xs text-slate-500">Gelen FB mesajlarına Gemini otomatik cevap versin</p>
              </div>
              <button
                onClick={() => setFbAutoReply(!fbAutoReply)}
                className={`relative w-11 h-6 rounded-full transition-colors ${fbAutoReply ? "bg-blue-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${fbAutoReply ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700">🤖 Instagram DM AI Yanıt</p>
                <p className="text-xs text-slate-500">Gelen IG mesajlarına Gemini otomatik cevap versin</p>
              </div>
              <button
                onClick={() => setIgAutoReply(!igAutoReply)}
                className={`relative w-11 h-6 rounded-full transition-colors ${igAutoReply ? "bg-pink-500" : "bg-slate-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${igAutoReply ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</> : "💾 Kaydet"}
            </Button>
            <Button onClick={handleTest} disabled={testing} variant="outline" className="flex-1">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test...</> : "🔌 Bağlantıyı Test Et"}
            </Button>
          </div>

          {saveResult && (
            <div className={`rounded-lg px-3 py-2 text-sm ${saveResult.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {saveResult.msg}
              {saveResult.ok && (
                <button onClick={handleRestart} disabled={restarting}
                  className="ml-3 inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800">
                  <RefreshCw className={`w-3 h-3 ${restarting ? "animate-spin" : ""}`} />
                  {restarting ? "Yeniden başlatılıyor..." : "Yeniden Başlat"}
                </button>
              )}
            </div>
          )}

          {testResult && (
            <div className={`rounded-lg p-3 text-sm border ${testResult.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              {testResult.ok ? (
                <p className="text-green-700 font-semibold">✅ Bağlantı başarılı! Sayfa: <strong>{testResult.pageName}</strong></p>
              ) : (
                <p className="text-red-700">❌ {testResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ADIM 3: Webhook ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
            Webhook Kurulumu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Public URL (Cloudflare Tunnel / Domain)</label>
            <input
              type="text"
              placeholder="https://xxxx.trycloudflare.com"
              value={webhookPublicUrl}
              onChange={(e) => setWebhookPublicUrl(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Facebook Webhook URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Facebook Messenger Webhook URL</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900 text-green-400 rounded-lg px-3 py-2 font-mono text-xs overflow-auto whitespace-nowrap">
                {fbWebhookUrl}
              </div>
              <button onClick={() => copyText(fbWebhookUrl, "fb-webhook")}
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                {copied === "fb-webhook" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Instagram Webhook URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Instagram DM Webhook URL</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900 text-pink-400 rounded-lg px-3 py-2 font-mono text-xs overflow-auto whitespace-nowrap">
                {igWebhookUrl}
              </div>
              <button onClick={() => copyText(igWebhookUrl, "ig-webhook")}
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                {copied === "ig-webhook" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Verify Token */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Verify Token (her iki webhook için)</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-100 text-slate-800 rounded-lg px-3 py-2 font-mono text-sm">
                {verifyToken}
              </div>
              <button onClick={() => copyText(verifyToken, "verify")}
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                {copied === "verify" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-xs text-blue-800">
            <p className="font-semibold">Meta Developers → Messenger Webhook Kayıt:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Meta Developers → Uygulamanız → Messenger → Webhooks → Edit</li>
              <li>Callback URL: <code>Facebook Messenger Webhook URL</code> (yukarıdan kopyala)</li>
              <li>Verify Token: yukarıdaki token → Verify and Save</li>
              <li>Webhook Fields → <strong>messages, messaging_postbacks → Subscribe</strong></li>
              <li>Instagram için aynı uygulamada Instagram → Webhooks bölümünü bulun</li>
              <li>Callback URL: Instagram Webhook URL → aynı Verify Token</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Cloudflare */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">4</span>
            🌐 Cloudflare Tunnel (Yerel → Public)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span>npx cloudflared tunnel --url http://localhost:3000</span>
              <button onClick={() => copyText("npx cloudflared tunnel --url http://localhost:3000", "tunnel")}
                className="ml-2 text-slate-400 hover:text-white flex-shrink-0">
                {copied === "tunnel" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500">Çıktıdan URL'yi alın → yukarıda Public URL alanına yapıştırın.</p>
        </CardContent>
      </Card>

      {/* Restart */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleRestart} disabled={restarting} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${restarting ? "animate-spin" : ""}`} />
          {restarting ? "Yeniden Başlatılıyor..." : "Sunucuyu Yeniden Başlat"}
        </Button>
      </div>
    </div>
  );
}
