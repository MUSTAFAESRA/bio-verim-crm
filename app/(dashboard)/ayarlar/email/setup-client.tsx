"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Circle, ExternalLink, Loader2, RefreshCw, Eye, EyeOff, Mail,
} from "lucide-react";

interface Props {
  resendConfigured: boolean;
  fromEmail: string;
}

export function EmailSetupClient({
  resendConfigured: initialConfigured,
  fromEmail: initialFromEmail,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState(initialFromEmail);
  const [showKey, setShowKey] = useState(false);
  const [configured, setConfigured] = useState(initialConfigured);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const handleSave = async () => {
    if (!apiKey && fromEmail === initialFromEmail) {
      setSaveResult({ ok: false, msg: "En az bir alanı değiştirin" });
      return;
    }
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "save",
          resendApiKey: apiKey || undefined,
          fromEmail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveResult({ ok: true, msg: "✅ Kaydedildi! Sunucu yeniden başlatılıyor..." });
        if (apiKey) setConfigured(true);
        setTimeout(async () => {
          await fetch("/api/settings/email", {
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
      const res = await fetch("/api/settings/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "test",
          resendApiKey: apiKey || undefined,
          fromEmail,
        }),
      });
      const data = await res.json();
      setTestResult({ ok: data.success, msg: data.message ?? data.error ?? "Bilinmeyen sonuç" });
    } catch {
      setTestResult({ ok: false, msg: "Bağlantı hatası" });
    } finally {
      setTesting(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await fetch("/api/settings/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restart" }),
      });
      setTimeout(() => setRestarting(false), 3000);
    } catch {
      setRestarting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📧 E-posta Entegrasyonu</h1>
          <p className="text-slate-500 text-sm mt-1">Resend API — Sekans emaillerini otomatik gönder</p>
        </div>
        <Badge variant={configured ? "success" : "warning"} className="text-sm px-3 py-1">
          {configured ? "✅ Bağlı" : "⭕ Bağlı Değil"}
        </Badge>
      </div>

      {/* Durum */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl p-3 text-xs font-medium border ${configured ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
          {configured ? "✅" : "⭕"} Resend API Key
        </div>
        <div className={`rounded-xl p-3 text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200`}>
          <Mail className="w-3 h-3 inline mr-1" /> {fromEmail.split("<")[0].trim()}
        </div>
      </div>

      {/* ── ADIM 1: Resend Hesabı ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Resend Hesabı Oluştur (Ücretsiz)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="space-y-2">
            {[
              { text: "resend.com → Ücretsiz kayıt ol (aylık 3.000 email ücretsiz)", link: "https://resend.com/signup" },
              { text: "Dashboard → API Keys → Create API Key" },
              { text: "Adı: 'Bioverim CRM', Permission: Sending access" },
              { text: "API Key'i kopyalayın (sadece bir kez gösterilir!)" },
              { text: "Domains → Add Domain → bioverim.com → DNS kayıtlarını ekleyin" },
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
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
            💡 Domain doğrulaması olmadan sadece <code>onboarding@resend.dev</code> adresinden gönderim yapılır. Kendi domain&apos;inizden göndermek için DNS kaydı gerekli.
          </div>
        </CardContent>
      </Card>

      {/* ── ADIM 2: API Bilgileri ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
            API Bilgilerini Gir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              Resend API Key
              {configured && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </label>
            <div className="flex gap-2">
              <input
                type={showKey ? "text" : "password"}
                placeholder={configured ? "re_••••••• (kaydedildi)" : "re_..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button onClick={() => setShowKey(!showKey)}
                className="px-2 py-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* From Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Gönderen Adres</label>
            <input
              type="text"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="Bioverim <noreply@bioverim.com>"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-slate-400">
              Format: <code>Ad Soyad &lt;email@domain.com&gt;</code> — Domain doğrulanmadan önce <code>onboarding@resend.dev</code> kullanın
            </p>
          </div>

          {/* Butonlar */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-purple-600 hover:bg-purple-700">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</> : "💾 Kaydet"}
            </Button>
            <Button onClick={handleTest} disabled={testing || !configured} variant="outline" className="flex-1">
              {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test...</> : "📤 Test Emaili Gönder"}
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
                <p className="text-green-700 font-semibold">✅ {testResult.msg}</p>
              ) : (
                <p className="text-red-700">❌ {testResult.msg}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sekans Email Bilgisi */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</span>
            Sekans Email Otomasyonu
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="space-y-2">
            {[
              "Sekans adımlarında kanal olarak 'email' seçildiğinde otomatik email gönderilir",
              "Gemini API email içeriğini müşteriye özel kişiselleştirir",
              "Her sabah 08:00'de cron job zamanı gelen email adımlarını çalıştırır",
              "Müşteri kartında email adresi dolu olmalıdır",
              "Gönderim sonucu İletişim Kayıtları'na otomatik eklenir",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
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
