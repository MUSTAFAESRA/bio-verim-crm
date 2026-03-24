"use client";

import { useState, useRef } from "react";
import { Sparkles, Copy, Check, RefreshCw, Save, Upload, X, FileText, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500";

interface Template {
  id: string;
  title: string;
  channel: string;
  category: string;
  content: string;
}

interface Props {
  onSave?: (content: string, channel: string, category: string) => void;
  templates?: Template[];
}

export function AiTemplateGenerator({ onSave, templates = [] }: Props) {
  const [mode, setMode] = useState<"new" | "improve">("new");
  const [channel, setChannel] = useState("whatsapp");
  const [category, setCategory] = useState("urun_tanitim");
  const [customerName, setCustomerName] = useState("");
  const [productName, setProductName] = useState("");
  const [context, setContext] = useState("");

  // Improve mode
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [manualTemplate, setManualTemplate] = useState("");
  const [improveRequest, setImproveRequest] = useState("");

  // File upload
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedContent, setUploadedContent] = useState("");
  const [uploadedMimeType, setUploadedMimeType] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [source, setSource] = useState<"ai" | "gemini" | "mock" | "mock_fallback" | null>(null);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  const handleFileUpload = async (file: File) => {
    setUploadLoading(true);
    setUploadedFileName(file.name);
    const isPdf = file.type === "application/pdf";
    const isText = file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".md");

    try {
      if (isPdf) {
        // PDF → base64 for Gemini multimodal
        const buffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        setUploadedContent(base64);
        setUploadedMimeType("application/pdf");
      } else if (isText) {
        const text = await file.text();
        setUploadedContent(text);
        setUploadedMimeType("text/plain");
      } else {
        // Try to read as text anyway
        const text = await file.text();
        setUploadedContent(text);
        setUploadedMimeType("text/plain");
      }
    } catch {
      setUploadedContent("");
      setUploadedFileName("");
    }
    setUploadLoading(false);
  };

  const clearFile = () => {
    setUploadedFileName("");
    setUploadedContent("");
    setUploadedMimeType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generate = async () => {
    setLoading(true);
    setResult("");
    try {
      const baseTemplate = mode === "improve"
        ? (selectedTemplate?.content || manualTemplate)
        : undefined;

      const res = await fetch("/api/ai/generate-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          channel: selectedTemplate?.channel || channel,
          category: selectedTemplate?.category || category,
          customerName,
          productName,
          context: mode === "improve" ? improveRequest : context,
          existingTemplate: baseTemplate,
          uploadedContent,
          uploadedMimeType,
        }),
      });
      const data = await res.json();
      setResult(data.content ?? "");
      setSource(data.source ?? null);
    } catch {
      setResult("Şablon üretilemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const effectiveChannel = mode === "improve" && selectedTemplate ? selectedTemplate.channel : channel;
  const effectiveCategory = mode === "improve" && selectedTemplate ? selectedTemplate.category : category;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
          <Sparkles className="w-4 h-4" />
          Yapay Zeka ile Şablon Üret
        </CardTitle>
        <p className="text-xs text-slate-500">Gemini AI ile anlık mesaj şablonu oluşturun veya mevcut şablonları geliştirin</p>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Mode Toggle */}
        <div className="flex rounded-lg border border-purple-200 overflow-hidden">
          <button
            onClick={() => setMode("new")}
            className={`flex-1 text-xs py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === "new" ? "bg-purple-600 text-white" : "bg-white text-slate-500 hover:bg-purple-50"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Sıfırdan Üret
          </button>
          <button
            onClick={() => setMode("improve")}
            className={`flex-1 text-xs py-2 font-medium transition-colors flex items-center justify-center gap-1.5 ${
              mode === "improve" ? "bg-purple-600 text-white" : "bg-white text-slate-500 hover:bg-purple-50"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Mevcut Şablonu Geliştir
          </button>
        </div>

        {mode === "new" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Kanal</Label>
                <select value={channel} onChange={e => setChannel(e.target.value)} className={selectClass}>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="email">📧 E-posta</option>
                  <option value="instagram">📸 Instagram DM</option>
                  <option value="linkedin_dm">💼 LinkedIn DM</option>
                  <option value="facebook_dm">📘 Facebook Mesaj</option>
                  <option value="call">📞 Telefon Scripti</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kategori</Label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={selectClass}>
                  <option value="urun_tanitim">Ürün Tanıtımı</option>
                  <option value="kampanya">Kampanya</option>
                  <option value="takip">Takip</option>
                  <option value="genel">Genel</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Müşteri adı (opsiyonel)</Label>
                <Input
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Ege Tarım A.Ş."
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ürün (opsiyonel)</Label>
                <Input
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="Bio Verim Sıvı Gübre"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ek bağlam / özel istek</Label>
              <Input
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Sezon başı, fiyat artışı öncesi bildirim..."
                className="h-8 text-xs"
              />
            </div>
          </>
        ) : (
          <>
            {/* Existing template picker */}
            {templates.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Kayıtlı Şablondan Seç</Label>
                <select
                  value={selectedTemplateId}
                  onChange={e => {
                    setSelectedTemplateId(e.target.value);
                    setManualTemplate("");
                  }}
                  className={selectClass}
                >
                  <option value="">— Şablon seçin —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.channel})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Show selected template content */}
            {selectedTemplate && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5">
                <p className="text-xs text-purple-600 font-medium mb-1">Seçili şablon:</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">{selectedTemplate.content}</p>
              </div>
            )}

            {/* Manual template paste */}
            {!selectedTemplateId && (
              <div className="space-y-1">
                <Label className="text-xs">Veya şablonu buraya yapıştırın</Label>
                <textarea
                  value={manualTemplate}
                  onChange={e => setManualTemplate(e.target.value)}
                  placeholder="Geliştirmek istediğiniz mevcut şablonu buraya yazın..."
                  rows={3}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Geliştirme talebi</Label>
              <Input
                value={improveRequest}
                onChange={e => setImproveRequest(e.target.value)}
                placeholder="Daha samimi yap, fiyat bilgisi ekle, kısalt..."
                className="h-8 text-xs"
              />
            </div>
          </>
        )}

        {/* File Upload (both modes) */}
        <div className="space-y-1">
          <Label className="text-xs">📎 Dosya Ekle (PDF, TXT — AI analiz eder)</Label>
          {uploadedFileName ? (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <span className="text-xs text-blue-700 truncate flex-1">{uploadedFileName}</span>
              <button onClick={clearFile} className="text-slate-400 hover:text-red-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadLoading ? (
                <p className="text-xs text-slate-400">Dosya okunuyor...</p>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">PDF veya TXT dosyası yükleyin</p>
                  <p className="text-xs text-slate-300">Fiyat listesi, katalog, brifing...</p>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </div>

        <Button
          onClick={generate}
          disabled={loading || (mode === "improve" && !selectedTemplateId && !manualTemplate.trim())}
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          size="sm"
        >
          {loading ? (
            <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {mode === "improve" ? "Geliştiriliyor..." : "Üretiliyor..."}</>
          ) : (
            <>{mode === "improve" ? <Wand2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            {mode === "improve" ? "Şablonu Geliştir" : "Şablon Üret"}</>
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-600">
                  {mode === "improve" ? "Geliştirilmiş Şablon" : "Üretilen Şablon"}
                </span>
                {(source === "ai" || source === "gemini") && (
                  <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">✨ Gemini AI</span>
                )}
                {(source === "mock" || source === "mock_fallback") && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">📋 Hazır</span>
                )}
                {uploadedFileName && (
                  <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">📎 Dosya analiz edildi</span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={copy}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Kopyalandı" : "Kopyala"}
                </button>
                {onSave && (
                  <button
                    onClick={() => onSave(result, effectiveChannel, effectiveCategory)}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded hover:bg-green-50"
                  >
                    <Save className="w-3 h-3" /> Kaydet
                  </button>
                )}
              </div>
            </div>
            <div className="bg-white border border-purple-100 rounded-lg p-3">
              <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">{result}</pre>
            </div>
            <p className="text-xs text-slate-400">
              💡 Şablonu düzenlemek için kopyalayıp &quot;Yeni Şablon Ekle&quot; formuna yapıştırın.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
