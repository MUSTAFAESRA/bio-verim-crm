"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, Trash2, Send, AlertCircle, CheckCircle2,
  Loader2, RefreshCw, Info, FileText, AlertTriangle, CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScheduledPost {
  id: string;
  content: string;
  title: string | null;
  scheduled_at: string;
  status: "scheduled" | "failed";
  error_message: string | null;
  created_at: string;
}

function formatTR(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Az önce / gönderiliyor...";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) return `${Math.floor(h / 24)} gün sonra`;
  if (h > 0) return `${h} saat ${m} dk sonra`;
  return `${m} dakika sonra`;
}

// Minimum datetime for input (şu anki saatten 5 dk sonra)
function minDateTime() {
  const d = new Date(Date.now() + 5 * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LinkedInScheduler() {
  const [content, setContent] = useState("");
  const [instruction, setInstruction] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);

  const charCount = content.length;
  const isOverLimit = charCount > 3000;

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch("/api/social/scheduled");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {}
    finally { setLoadingPosts(false); }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // Her 60 saniyede bir bekleyen postları kontrol et
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/social/scheduled/execute").catch(() => {});
      loadPosts();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadPosts]);

  const handleSchedule = async () => {
    if (!content.trim() || !scheduledAt || isOverLimit) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/social/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, instruction, scheduledAt }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Zamanlanamadı."); return; }

      setSuccess(`✅ Post zamanlandı! ${formatTR(scheduledAt)} tarihinde otomatik paylaşılacak.`);
      setContent("");
      setInstruction("");
      setScheduledAt("");
      loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bağlantı hatası.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch("/api/social/scheduled", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {}
    finally { setDeletingId(null); }
  };

  const handleExecuteNow = async () => {
    setExecuting(true);
    try {
      const res = await fetch("/api/social/scheduled/execute");
      const data = await res.json();
      if (data.sent > 0) setSuccess(`✅ ${data.sent} zamanlanmış post gönderildi.`);
      loadPosts();
    } catch {}
    finally { setExecuting(false); }
  };

  const canSchedule = content.trim().length > 0 && scheduledAt !== "" && !isOverLimit && !loading;

  const pendingCount = posts.filter((p) => p.status === "scheduled").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;

  return (
    <div className="space-y-5">
      {/* ─── Form ─── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-[#0077B5]" />
          <h2 className="text-sm font-semibold text-slate-800">Zamanlanmış Post Oluştur</h2>
        </div>

        <div className="p-5 space-y-4">
          {/* İçerik */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Post İçeriği
              <span className="text-slate-400 font-normal">(zorunlu)</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="LinkedIn'de paylaşılacak içeriği yaz..."
              rows={5}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0077B5] focus:bg-white transition-colors"
            />
            <div className="flex justify-end">
              <span className={`text-xs tabular-nums ${isOverLimit ? "text-red-500 font-medium" : "text-slate-400"}`}>
                {charCount.toLocaleString("tr-TR")} / 3.000
              </span>
            </div>
          </div>

          {/* Talimat alanı */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-500" /> Talimat / Not
              <span className="text-slate-400 font-normal">(opsiyonel)</span>
            </label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Bu post hakkında not veya talimat ekle... Örn: 'Pazartesi sabahı kampanya başlangıcı için zamanlandı. Eğer ürün hazır değilse iptal et.'"
              rows={3}
              className="w-full resize-none rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-colors"
            />
            <p className="text-[11px] text-slate-400">
              💡 Bu alan yalnızca sana özel not olarak kaydedilir. LinkedIn'e gönderilmez.
            </p>
          </div>

          {/* Tarih & Saat */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Yayın Tarihi ve Saati
              <span className="text-slate-400 font-normal">(zorunlu)</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              min={minDateTime()}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-10 w-full sm:w-64 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0077B5] transition-colors"
            />
          </div>

          {/* Bilgi kutusu */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-700">
            <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>
              Zamanlanmış postlar her dakika otomatik kontrol edilir. Sayfa açık olduğunda gönderim gerçekleşir.
              Kesin zamanlama için sunucu tarafı cron kurulumu önerilir.
            </span>
          </div>

          {/* Hata / Başarı */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Buton */}
          <Button
            onClick={handleSchedule}
            disabled={!canSchedule}
            className="bg-[#0077B5] hover:bg-[#005582] text-white h-10"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Zamanlanıyor...</>
            ) : (
              <><Calendar className="w-4 h-4" /> Zamanla</>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Bekleyen Postlar ─── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Zamanlanmış Postlar</h3>
            {pendingCount > 0 && (
              <Badge className="bg-blue-100 text-blue-700 text-[10px] h-4 px-1.5">{pendingCount} bekliyor</Badge>
            )}
            {failedCount > 0 && (
              <Badge className="bg-red-100 text-red-700 text-[10px] h-4 px-1.5">{failedCount} hatalı</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExecuteNow}
              disabled={executing || pendingCount === 0}
              className="text-xs h-7 text-slate-500"
            >
              {executing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Şimdi Gönder
            </Button>
            <Button variant="ghost" size="sm" onClick={loadPosts} className="text-xs h-7 text-slate-500">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {loadingPosts ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarClock className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-sm text-slate-400">Henüz zamanlanmış post yok.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <div key={post.id} className="px-5 py-4 flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  post.status === "failed" ? "bg-red-50" : "bg-blue-50"
                }`}>
                  {post.status === "failed"
                    ? <AlertTriangle className="w-4 h-4 text-red-400" />
                    : <Clock className="w-4 h-4 text-[#0077B5]" />
                  }
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{post.content}</p>

                  {/* Talimat */}
                  {post.title && !post.title.startsWith("post_id:") && post.title !== post.content.substring(0, 100) && (
                    <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
                      <Info className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 line-clamp-2">{post.title}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{formatTR(post.scheduled_at)}</span>
                    </div>
                    {post.status === "scheduled" && (
                      <span className="text-[11px] text-blue-600 font-medium">
                        ⏰ {timeLeft(post.scheduled_at)}
                      </span>
                    )}
                    {post.status === "failed" && (
                      <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] h-4">
                        Hata: {post.error_message || "Bilinmeyen"}
                      </Badge>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={deletingId === post.id}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                  title="İptal et"
                >
                  {deletingId === post.id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
