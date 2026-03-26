"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock, Trash2, Send, AlertCircle, CheckCircle2, Loader2, RefreshCw,
  AlertTriangle, CalendarClock, MessageCircle, FileVideo, FileText,
  Sparkles, Edit3, Wand2, Calendar, ImagePlus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Platform = "facebook" | "instagram" | "linkedin";

interface ScheduledPost {
  id: string;
  platform: string;
  content: string;
  title: string | null;
  scheduled_at: string;
  status: "scheduled" | "pending_approval" | "failed";
  error_message: string | null;
  telegram_message_id: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
}

interface AiResult {
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  imageModel: string | null;
  scheduleLabel: string;
  allDates: string[];
  scheduleMode: string;
  contentSource?: "claude" | "gemini" | "template";
}

function formatTR(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function timeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Az önce";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)} gün sonra`;
  if (h > 0) return `${h} sa ${m} dk sonra`;
  return `${m} dk sonra`;
}

const PLATFORM_COLOR: Record<Platform, string> = {
  linkedin: "text-[#0077B5]", facebook: "text-blue-600", instagram: "text-pink-500",
};
const PLATFORM_BTN: Record<Platform, string> = {
  linkedin: "from-[#0077B5] to-blue-600 hover:from-[#005582] hover:to-blue-700",
  facebook: "from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700",
  instagram: "from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600",
};

interface Props { platform: Platform; }

export default function PostScheduler({ platform }: Props) {
  const [instruction, setInstruction] = useState("");
  const [tone, setTone] = useState("profesyonel");
  const [refImage, setRefImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // İşlem adımları
  const [step, setStep] = useState<"idle" | "analyzing" | "writing" | "imaging" | "scheduling" | "done" | "error">("idle");
  const [stepLabel, setStepLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResult | null>(null);

  // Liste
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`/api/social/scheduled?platform=${platform}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch { /* ignore */ }
    finally { setLoadingPosts(false); }
  }, [platform]);

  useEffect(() => { loadPosts(); }, [loadPosts]);
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`/api/social/scheduled/execute?platform=${platform}`).catch(() => {});
      loadPosts();
    }, 60000);
    return () => clearInterval(id);
  }, [platform, loadPosts]);

  const pendingCount = posts.filter((p) => p.status === "scheduled").length;
  const approvalCount = posts.filter((p) => p.status === "pending_approval").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;

  // ─── ANA AKIŞ ───────────────────────────────────────────────
  const handleRun = async () => {
    if (!instruction.trim() || step !== "idle") return;
    setError(null);
    setResult(null);

    try {
      // Adım 1: AI analiz + içerik + görsel
      setStep("analyzing");
      setStepLabel("🔍 Talimat analiz ediliyor...");
      await new Promise((r) => setTimeout(r, 400));

      setStep("writing");
      setStepLabel("✍️ İçerik yazılıyor...");

      const createRes = await fetch("/api/social/ai-create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction, platform, tone,
          ...(refImage ? { referenceImageBase64: refImage.base64, referenceImageMimeType: refImage.mimeType } : {}),
        }),
      });
      const createData = await createRes.json();

      if (!createRes.ok || !createData.content) {
        setError(createData.error || "AI içerik üretemedi.");
        setStep("error");
        return;
      }

      if (createData.needsImage && createData.mediaUrl) {
        setStep("imaging");
        setStepLabel("🎨 Görsel üretildi, kaydediliyor...");
        await new Promise((r) => setTimeout(r, 300));
      }

      // Adım 2: Zamanla
      setStep("scheduling");
      setStepLabel("📅 Zamanlama yapılıyor...");

      const dates: string[] = createData.allDates || [createData.scheduledAt];
      let successCount = 0;

      for (const date of dates) {
        const schRes = await fetch("/api/social/scheduled", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: createData.content,
            instruction: instruction.trim(),
            scheduledAt: date,
            platform,
            mediaUrl: createData.mediaUrl,
            mediaType: createData.mediaType,
          }),
        });
        if (schRes.ok) successCount++;
      }

      if (successCount === 0) {
        setError("Zamanlama başarısız oldu.");
        setStep("error");
        return;
      }

      setResult({
        content: createData.content,
        mediaUrl: createData.mediaUrl,
        mediaType: createData.mediaType,
        imageModel: createData.imageModel,
        scheduleLabel: createData.scheduleLabel,
        allDates: dates,
        scheduleMode: createData.scheduleMode,
        contentSource: createData.contentSource,
      });
      setStep("done");
      loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası.");
      setStep("error");
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // data:image/jpeg;base64,XXXX formatından base64'ü ayır
      const [meta, base64] = dataUrl.split(",");
      const mimeType = meta.match(/:(.*?);/)?.[1] || "image/jpeg";
      setRefImage({ base64, mimeType, previewUrl: dataUrl });
    };
    reader.readAsDataURL(file);
    // input'u sıfırla (aynı dosyayı tekrar seçebilmek için)
    e.target.value = "";
  };

  const handleReset = () => {
    setStep("idle");
    setInstruction("");
    setResult(null);
    setError(null);
    setStepLabel("");
    setRefImage(null);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch("/api/social/scheduled", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      setPosts((p) => p.filter((x) => x.id !== id));
    } catch { /* ignore */ }
    finally { setDeletingId(null); }
  };

  const isRunning = ["analyzing", "writing", "imaging", "scheduling"].includes(step);

  return (
    <div className="space-y-5">

      {/* ══ FORM ══ */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Wand2 className={`w-4 h-4 ${PLATFORM_COLOR[platform]}`} />
          <h2 className="text-sm font-semibold text-slate-800">AI ile Zamanlanmış Post</h2>
          <span className="text-xs text-slate-400 ml-1">— Talimatı yaz, gerisini AI halleder</span>
        </div>

        <div className="p-5 space-y-5">

          {/* ── TALİMAT ── */}
          <div className="space-y-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Edit3 className="w-4 h-4 text-violet-500" />
              Talimat
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              disabled={isRunning || step === "done"}
              placeholder={
                platform === "instagram"
                  ? "Örn: 'Yarın sabah 9'da gübre kampanyamızı duyuran, %20 indirim vurgulu, görsel içerikli bir Instagram postu yayınla'\n\nYa da: 'Her pazartesi sabahı organik tarım ipuçları paylaş, 4 hafta boyunca'"
                  : platform === "linkedin"
                  ? "Örn: 'Bu cuma öğleden sonra, organik gübrenin verim artışını anlatan bilgilendirici bir LinkedIn paylaşımı yap'\n\nYa da: 'Her ayın 1'inde sektör raporu paylaş, 3 ay boyunca'"
                  : "Örn: 'Yarın akşam 7'de yeni ürün lansmanımızı duyuran, kampanya görselli bir Facebook postu yayınla'"
              }
              rows={5}
              autoFocus
              className="w-full resize-none rounded-xl border-2 border-violet-200 bg-violet-50 px-4 py-3 text-sm text-slate-800 placeholder:text-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 focus:bg-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
              <Sparkles className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
              <span>
                Talimanda <strong>ne</strong> (içerik), <strong>nasıl</strong> (ton), <strong>ne zaman</strong> (tarih/tekrar) ve <strong>görsel mi</strong> istediğini belirt.
                AI her şeyi okuyup analiz eder — metin yazar, görsel üretir, zamanı belirler, planlar ve Telegram&apos;a onay gönderir.
              </span>
            </p>
          </div>

          {/* ── REFERANS GÖRSEL ── */}
          {step === "idle" && (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              {refImage ? (
                <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                  <img src={refImage.previewUrl} alt="Referans görsel" className="w-16 h-16 object-cover rounded-lg border border-violet-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-violet-700">Referans görsel yüklendi</p>
                    <p className="text-[11px] text-violet-500 mt-0.5">AI bu görseli analiz ederek içerik üretecek</p>
                  </div>
                  <button
                    onClick={() => setRefImage(null)}
                    className="text-violet-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50 transition-all"
                >
                  <ImagePlus className="w-4 h-4" />
                  <span>Ürün / Marka Görseli Ekle <span className="text-[11px]">(opsiyonel — AI analiz eder)</span></span>
                </button>
              )}
            </div>
          )}

          {/* ── TON ── */}
          {step === "idle" && (
            <div className="flex flex-wrap gap-2">
              {[
                { key: "profesyonel", label: "🎯 Profesyonel" },
                { key: "samimi",      label: "😊 Samimi" },
                { key: "heyecanlı",   label: "🔥 Heyecanlı" },
                { key: "bilgilendirici", label: "📚 Bilgilendirici" },
                { key: "kampanya",    label: "🎁 Kampanya" },
              ].map((t) => (
                <button key={t.key} onClick={() => setTone(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    tone === t.key
                      ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                      : "bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* ── ÇALIŞIYOR ── */}
          {isRunning && (
            <div className="flex flex-col items-center justify-center py-6 gap-4">
              {/* Adım göstergesi */}
              <div className="flex items-center gap-3">
                {["analyzing", "writing", "imaging", "scheduling"].map((s, i) => {
                  const labels = ["Analiz", "İçerik", "Görsel", "Zamanlama"];
                  const icons = ["🔍", "✍️", "🎨", "📅"];
                  const stepOrder = ["analyzing", "writing", "imaging", "scheduling"];
                  const currentIdx = stepOrder.indexOf(step);
                  const isActive = s === step;
                  const isDone = stepOrder.indexOf(s) < currentIdx;
                  return (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all ${
                        isActive ? "bg-violet-600 text-white shadow-lg scale-110" :
                        isDone ? "bg-green-100 text-green-600" :
                        "bg-slate-100 text-slate-300"
                      }`}>
                        {isDone ? "✓" : icons[i]}
                      </div>
                      <span className={`text-[10px] font-medium ${isActive ? "text-violet-600" : isDone ? "text-green-600" : "text-slate-300"}`}>
                        {labels[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                <span>{stepLabel}</span>
              </div>
            </div>
          )}

          {/* ── HATA ── */}
          {step === "error" && error && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
              <button onClick={handleReset}
                className="text-xs text-slate-500 hover:text-slate-700 underline">
                ← Tekrar dene
              </button>
            </div>
          )}

          {/* ── SONUÇ (DONE) ── */}
          {step === "done" && result && (
            <div className="space-y-4">
              {/* Özet kart */}
              <div className="bg-green-50 border border-green-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-green-100">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">
                    {result.allDates.length} post planlandı — Telegram onayı gönderildi!
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <Calendar className="w-3.5 h-3.5" />
                    <span><strong>Zaman:</strong> {result.scheduleLabel}</span>
                  </div>
                  {result.allDates.length > 1 && (
                    <p className="text-[11px] text-green-600">
                      {result.allDates.slice(0, 3).map(formatTR).join(", ")}{result.allDates.length > 3 ? ` +${result.allDates.length - 3} daha` : ""}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>
                      <strong>İçerik:</strong>{" "}
                      {result.contentSource === "claude"
                        ? "Claude AI ile yazıldı"
                        : result.contentSource === "gemini"
                        ? "Gemini AI ile yazıldı"
                        : "Hazır şablon kullanıldı"}
                    </span>
                  </div>
                  {result.imageModel && (
                    <div className="flex items-center gap-2 text-xs text-green-700">
                      <Wand2 className="w-3.5 h-3.5" />
                      <span><strong>Görsel:</strong> {result.imageModel} ile üretildi</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Görsel önizleme */}
              {result.mediaUrl && result.mediaType?.startsWith("image/") && (
                <div className="rounded-xl overflow-hidden border border-slate-200">
                  <img src={result.mediaUrl} alt="AI görseli" className="w-full max-h-64 object-cover" />
                  <div className="px-3 py-2 bg-slate-50 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Wand2 className="w-3 h-3" />
                    AI tarafından üretilen görsel — {result.imageModel}
                  </div>
                </div>
              )}

              {/* İçerik önizleme */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[11px] text-slate-400 font-medium mb-2">Üretilen içerik:</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-5">
                  {result.content}
                </p>
              </div>

              {/* Yeni talimat */}
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-violet-300 hover:text-violet-500 hover:bg-violet-50 transition-all"
              >
                + Yeni Talimat Gir
              </button>
            </div>
          )}

          {/* ── ANA BUTON ── */}
          {step === "idle" && (
            <button
              onClick={handleRun}
              disabled={!instruction.trim()}
              className={`w-full h-14 rounded-xl text-white font-bold text-base flex items-center justify-center gap-3 bg-gradient-to-r ${PLATFORM_BTN[platform]} disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg`}
            >
              <Wand2 className="w-5 h-5" />
              Analiz Et, Yaz, Planla ve Gönder
            </button>
          )}

        </div>
      </div>

      {/* ══ ZAMANLANMIŞ LİSTE ══ */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Zamanlanmış Postlar</h3>
            {pendingCount > 0 && <Badge className="bg-blue-100 text-blue-700 text-[10px] h-4 px-1.5">{pendingCount} bekliyor</Badge>}
            {approvalCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px] h-4 px-1.5">{approvalCount} onay bekliyor</Badge>}
            {failedCount > 0 && <Badge className="bg-red-100 text-red-700 text-[10px] h-4 px-1.5">{failedCount} hatalı</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={async () => {
              setExecuting(true);
              try { const r = await fetch(`/api/social/scheduled/execute?platform=${platform}`); const d = await r.json(); if (d.sent > 0) loadPosts(); } catch { /* */ }
              finally { setExecuting(false); }
            }} disabled={executing || pendingCount === 0} className="text-xs h-7 text-slate-500">
              {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Şimdi Gönder
            </Button>
            <Button variant="ghost" size="sm" onClick={loadPosts} className="text-xs h-7 text-slate-500">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {loadingPosts ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarClock className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">Henüz zamanlanmış post yok.</p>
            <p className="text-xs text-slate-300 mt-1">Yukarıya talimatını yaz ve tek butona bas!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <div key={post.id} className="px-5 py-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  post.status === "failed" ? "bg-red-50" : post.status === "pending_approval" ? "bg-amber-50" : "bg-blue-50"
                }`}>
                  {post.status === "failed" ? <AlertTriangle className="w-4 h-4 text-red-400" />
                   : post.status === "pending_approval" ? <MessageCircle className="w-4 h-4 text-amber-500" />
                   : <Clock className={`w-4 h-4 ${PLATFORM_COLOR[platform]}`} />}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {post.title && !post.title.startsWith("post_id:") && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-violet-400 flex-shrink-0" />
                      <p className="text-[11px] text-violet-600 font-medium line-clamp-1">{post.title}</p>
                    </div>
                  )}
                  {post.media_url && post.media_type?.startsWith("image/") && (
                    <img src={post.media_url} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-100" />
                  )}
                  {post.media_url && !post.media_type?.startsWith("image/") && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      {post.media_type?.startsWith("video/") ? <FileVideo className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                      <span>Medya eklendi</span>
                    </div>
                  )}
                  <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{post.content}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" /><span>{formatTR(post.scheduled_at)}</span>
                    </div>
                    {post.status === "scheduled" && (
                      <span className="text-[11px] text-blue-600 font-medium">⏰ {timeLeft(post.scheduled_at)}</span>
                    )}
                    {post.status === "pending_approval" && (
                      <Badge className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] h-4">📱 Telegram Onayı Bekleniyor</Badge>
                    )}
                    {post.status === "failed" && (
                      <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] h-4">❌ {post.error_message || "Hata"}</Badge>
                    )}
                  </div>
                </div>
                <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                  {deletingId === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
