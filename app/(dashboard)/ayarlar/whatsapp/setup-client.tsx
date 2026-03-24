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
  verifyToken: string;
  webhookUrl: string;
  tokenConfigured: boolean;
  phoneIdConfigured: boolean;
  autoReply: boolean;
}

export function WhatsAppSetupClient({
  verifyToken: initialVerifyToken,
  webhookUrl: initialWebhookUrl,
  tokenConfigured: initialToken,
  phoneIdConfigured: initialPhone,
  autoReply: initialAutoReply,
}: Props) {
  const [accessToken, setAccessToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [webhookPublicUrl, setWebhookPublicUrl] = useState("");
  const [autoReply, setAutoReply] = useState(initialAutoReply);
  const [showToken, setShowToken] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean; account?: string; phone?: string;
    verifiedName?: string; qualityRating?: string; error?: string;
  } | null>(null);

  const [tokenOk, setTokenOk] = useState(initialToken);
  const [phoneOk, setPhoneOk] = useState(initialPhone);
  const [copied, setCopied] = useState<string | null>(null);

  const verifyToken = initialVerifyToken;
  const webhookUrl = webhookPublicUrl
    ? `${webhookPublicUrl.replace(/\/$/, "")}/api/webhooks/whatsapp`
    : initialWebhookUrl;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = async () => {
    if (!accessToken && !phoneNumberId && !webhookPublicUrl) {
      setSaveResult({ ok: false, msg: "En az bir alan doldurun" });
      return;
    }
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/settings/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          accessToken: accessToken || undefined,
          phoneNumberId: phoneNumberId || undefined,
          webhookUrl: webhookPublicUrl || undefined,
          autoReply,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveResult({ ok: true, msg: "✅ Kaydedildi! Sunucu yeniden başlatılıyor..." });
        if (accessToken) setTokenOk(true);
        if (phoneNumberId) setPhoneOk(true);
        // Sunucuyu restart et
        setTimeout(async () => {
          await fetch("/api/settings/whatsapp", {
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
      const res = await fetch("/api/settings/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "test",
          accessToken: accessToken || undefined,
          phoneNumberId: phoneNumberId || undefined,
        }),
      });
      const data = await res.json();
      setTestResult({
        ok: data.success,
        account: data.account,
        phone: data.phone,
        verifiedName: data.verifiedName,
        qualityRating: data.qualityRating,
        error: data.error,
      });
    } catch {
      setTestResult({ ok: false, error: "Bağlantı hatası" });
    } finally {
      setTesting(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await fetch("/api/settings/whatsapp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      setTimeout(() => setRestarting(false), 3000);
    } catch {
      setRestarting(false);
    }
  };

  const allConfigured = tokenOk && phoneOk;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📱 WhatsApp Business API</h1>
          <p className="text-slate-500 text-sm mt-1">Meta Cloud API — Ayda 1000 konuşma ücretsiz</p>
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
          { label: "Access Token", ok: tokenOk },
          { label: "Phone Number ID", ok: phoneOk },
          { label: "Webhook Hazır", ok: allConfigured },
          { label: "AI Otomatik Yanıt", ok: autoReply, blue: true },
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

      {/* ── ADIM 1: Meta Developer ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Meta Developer Hesabı & WhatsApp Uygulaması
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="space-y-2">
            {[
              { text: "developers.facebook.com → giriş yap", link: "https://developers.facebook.com" },
              { text: "My Apps → Create App → Business type seç" },
              { text: "App adı: 'Bioverim CRM' → Create App" },
              { text: "Dashboard'da Add Product → WhatsApp → Setup tıkla" },
              { text: "Bir Facebook Business Portfolio bağla (yoksa oluştur)" },
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
        </CardContent>
      </Card>

      {/* ── ADIM 2: Token & Phone ID ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">2</span>
            API Bilgilerini Gir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            📍 <strong>WhatsApp → API Setup</strong> sayfasında "Temporary access token" ve "Phone number ID" değerlerini bulabilirsiniz.
          </div>

          {/* Access Token */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Access Token
              {tokenOk && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                placeholder={tokenOk ? "••••••• (kaydedildi)" : "EAAG... veya EAABs..."}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button onClick={() => setShowToken(!showToken)}
                className="px-2 py-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              ⚠️ Temporary token 24 saat geçerli. Production için System User Token al.
            </p>
          </div>

          {/* Phone Number ID */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Phone Number ID
              {phoneOk && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </label>
            <input
              type="text"
              placeholder={phoneOk ? "(kaydedildi)" : "123456789012345"}
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* AI Auto-Reply */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-slate-700">🤖 AI Otomatik Yanıt</p>
              <p className="text-xs text-slate-500">Gelen mesajlara Gemini otomatik cevap versin</p>
            </div>
            <button
              onClick={() => setAutoReply(!autoReply)}
              className={`relative w-11 h-6 rounded-full transition-colors ${autoReply ? "bg-green-500" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoReply ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Kaydet + Test Butonları */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</> : "💾 Kaydet"}
            </Button>
            <Button onClick={handleTest} disabled={testing} variant="outline" className="flex-1">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test...</> : "🔌 Bağlantıyı Test Et"}
            </Button>
          </div>

          {/* Kaydet Sonucu */}
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

          {/* Test Sonucu */}
          {testResult && (
            <div className={`rounded-lg p-3 text-sm border ${testResult.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              {testResult.ok ? (
                <div className="space-y-1">
                  <p className="text-green-700 font-semibold">✅ Bağlantı başarılı!</p>
                  {testResult.account && <p className="text-xs text-slate-600">Hesap: <strong>{testResult.account}</strong></p>}
                  {testResult.phone && <p className="text-xs text-slate-600">Telefon: <strong>{testResult.phone}</strong> ({testResult.verifiedName})</p>}
                  {testResult.qualityRating && <p className="text-xs text-slate-600">Kalite: <strong>{testResult.qualityRating}</strong></p>}
                </div>
              ) : (
                <p className="text-red-700">❌ {testResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── ADIM 3: Webhook URL ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</span>
            Webhook Kurulumu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Public URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Public URL (Cloudflare Tunnel / Domain)</label>
            <input
              type="text"
              placeholder="https://xxxx.trycloudflare.com"
              value={webhookPublicUrl}
              onChange={(e) => setWebhookPublicUrl(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-slate-400">
              Şu an localhost ise Cloudflare Tunnel ile public URL alın (aşağıya bakın)
            </p>
          </div>

          {/* Webhook URL */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Webhook URL (Meta'ya girilecek)</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-slate-900 text-green-400 rounded-lg px-3 py-2 font-mono text-xs overflow-auto whitespace-nowrap">
                {webhookUrl}
              </div>
              <button onClick={() => copyText(webhookUrl, "webhook")}
                className="px-3 py-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                {copied === "webhook" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Verify Token */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Verify Token</label>
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

          {/* Meta webhook kayıt adımları */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2 text-xs text-blue-800">
            <p className="font-semibold">Meta'da Webhook Kayıt:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Meta Developer → Uygulamanız → WhatsApp → Configuration</li>
              <li>Webhook bölümü → <strong>Edit</strong> tıkla</li>
              <li>Callback URL: yukarıdaki Webhook URL'sini yapıştır</li>
              <li>Verify Token: yukarıdaki Verify Token'ı yapıştır</li>
              <li><strong>Verify and Save</strong> tıkla</li>
              <li>Webhook Fields bölümünden <strong>messages → Subscribe</strong></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* ── ADIM 4: Cloudflare Tunnel ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">4</span>
            🌐 Cloudflare Tunnel (Yerel Sunucu → Public URL)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-slate-600 text-xs">
            Sunucunuz localhost:3000'de ise Meta webhook'u doğrulayamaz. Cloudflare Tunnel ile 1 komutla public URL alın:
          </p>

          <div className="bg-slate-900 text-green-400 rounded-lg p-3 font-mono text-xs">
            <p className="text-slate-500"># Yeni terminal aç, bu komutu çalıştır:</p>
            <div className="flex items-center justify-between mt-1">
              <span>npx cloudflared tunnel --url http://localhost:3000</span>
              <button onClick={() => copyText("npx cloudflared tunnel --url http://localhost:3000", "tunnel")}
                className="ml-2 text-slate-400 hover:text-white flex-shrink-0">
                {copied === "tunnel" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs text-slate-600">
            <p className="font-medium">Çıktıdan URL'yi alın:</p>
            <p className="font-mono text-green-700">https://xxxx-xxxx-xxxx.trycloudflare.com</p>
            <p>→ Yukarıda <strong>"Public URL"</strong> alanına yapıştırın → <strong>Kaydet</strong></p>
            <p>→ Meta Webhook URL: <code>https://xxxx.trycloudflare.com/api/webhooks/whatsapp</code></p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            ⚠️ Cloudflare Tunnel her açılışta farklı URL verir. Kalıcı URL için <strong>Vercel, Railway veya VPS</strong>'e deploy edin.
          </div>
        </CardContent>
      </Card>

      {/* ── ADIM 5: Test Mesajı ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">5</span>
            Test Mesajı Gönder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="space-y-2">
            {[
              "Meta → WhatsApp → API Setup → 'To:' alanına kendi numaranı ekle",
              "Önce 'Send Message' ile test mesajı gönder → WhatsApp'ta onay al",
              "Ardından kendi WhatsApp'tan bu numaraya mesaj yaz",
              "CRM → İletişim sayfasında otomatik kayıt görmelisiniz",
              "AI Otomatik Yanıt aktifse Gemini mesajı otomatik yanıtlar",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700">
            ✅ Başarılı test sonrası gerçek Bioverim WhatsApp numarasını Meta'ya ekleyebilirsiniz. <strong>Ayda 1000 konuşma ücretsiz.</strong>
          </div>
        </CardContent>
      </Card>

      {/* Restart Butonu */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleRestart} disabled={restarting} size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${restarting ? "animate-spin" : ""}`} />
          {restarting ? "Yeniden Başlatılıyor..." : "Sunucuyu Yeniden Başlat"}
        </Button>
      </div>
    </div>
  );
}
