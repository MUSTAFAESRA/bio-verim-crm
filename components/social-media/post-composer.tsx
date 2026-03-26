"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Upload, X, Image, FileText, Video, Send, Clock, CheckCircle2, AlertCircle, Eye, Facebook, Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Platform = "facebook" | "instagram" | "linkedin";

const PLATFORM_CONFIG = {
  facebook: {
    name: "Facebook",
    color: "blue",
    accent: "bg-blue-600 hover:bg-blue-700",
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    maxChars: 63206,
    accept: "image/jpeg,image/png,image/gif,video/mp4,application/pdf",
    acceptLabel: "JPG, PNG, GIF, MP4, PDF",
    requiresMedia: false,
    Icon: Facebook,
    iconColor: "text-blue-500",
    previewBg: "bg-blue-50",
  },
  instagram: {
    name: "Instagram",
    color: "pink",
    accent: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0",
    border: "border-pink-200",
    bg: "bg-pink-50",
    text: "text-pink-700",
    maxChars: 2200,
    accept: "image/jpeg,image/png,video/mp4",
    acceptLabel: "JPG, PNG, MP4 (Reel)",
    requiresMedia: true,
    Icon: Instagram,
    iconColor: "text-pink-500",
    previewBg: "bg-gradient-to-br from-purple-50 to-pink-50",
  },
  linkedin: {
    name: "LinkedIn",
    color: "blue",
    accent: "bg-[#0077B5] hover:bg-[#005582]",
    border: "border-blue-300",
    bg: "bg-blue-50",
    text: "text-blue-800",
    maxChars: 3000,
    accept: "image/jpeg,image/png,video/mp4,application/pdf",
    acceptLabel: "JPG, PNG, MP4, PDF (Doküman)",
    requiresMedia: false,
    Icon: Linkedin,
    iconColor: "text-[#0077B5]",
    previewBg: "bg-slate-50",
  },
};

const POST_TYPE_ICON = {
  image: Image,
  video: Video,
  document: FileText,
  text: FileText,
};

interface RecentPost {
  id: string;
  platform: string;
  post_type: string | null;
  content: string;
  media_url: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
}

interface Props {
  platform: Platform;
  initialPosts?: RecentPost[];
}

export default function PostComposer({ platform, initialPosts = [] }: Props) {
  const config = PLATFORM_CONFIG[platform];
  const [content, setContent] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [recentPosts, setRecentPosts] = useState<RecentPost[]>(initialPosts);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = config.Icon;

  const charCount = content.length;
  const charPercent = Math.min((charCount / config.maxChars) * 100, 100);
  const isOverLimit = charCount > config.maxChars;
  const canPost = content.trim().length > 0
    && !isOverLimit
    && !(config.requiresMedia && !mediaFile)
    && !loading;

  const handleFileSelect = useCallback((file: File) => {
    setError(null);
    const allowed = config.accept.split(",");
    if (!allowed.includes(file.type)) {
      setError(`Bu platform ${config.acceptLabel} formatlarını destekler.`);
      return;
    }
    if (file.size > 52428800) {
      setError("Dosya boyutu 50MB'ı aşıyor.");
      return;
    }
    setMediaFile(file);
    setMediaType(file.type);
    setUploadedMediaUrl(null);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
    } else if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setMediaPreviewUrl(url);
    } else {
      setMediaPreviewUrl(null);
    }
  }, [config]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreviewUrl(null);
    setMediaType(null);
    setUploadedMediaUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePost = async () => {
    if (!canPost) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let finalMediaUrl = uploadedMediaUrl;

      // 1. Medya yükleme
      if (mediaFile && !uploadedMediaUrl) {
        setUploadingMedia(true);
        const fd = new FormData();
        fd.set("file", mediaFile);
        const uploadRes = await fetch("/api/social/upload-media", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        setUploadingMedia(false);

        if (!uploadRes.ok || !uploadData.url) {
          setError(uploadData.error || "Medya yüklenemedi.");
          setLoading(false);
          return;
        }
        finalMediaUrl = uploadData.url;
        setUploadedMediaUrl(uploadData.url);
      }

      // 2. Platform'a post gönder
      const postRes = await fetch(`/api/social/post/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrl: finalMediaUrl,
          mediaType,
        }),
      });
      const postData = await postRes.json();

      if (!postRes.ok || !postData.ok) {
        setError(postData.error || "Post paylaşılamadı.");
        setLoading(false);
        return;
      }

      setSuccess(`✅ ${config.name} sayfanızda başarıyla yayınlandı!`);
      setContent("");
      clearMedia();

      // Listeyi güncelle
      setRecentPosts((prev) => [{
        id: Date.now().toString(),
        platform,
        post_type: mediaType
          ? mediaType.startsWith("image/") ? "image"
          : mediaType.startsWith("video/") ? "video"
          : "document"
          : "text",
        content,
        media_url: finalMediaUrl,
        status: "published",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }, ...prev.slice(0, 4)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Beklenmeyen hata.");
    } finally {
      setLoading(false);
      setUploadingMedia(false);
    }
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (mediaPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── Sol: Editör ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Metin Alanı */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.iconColor}`} />
              <span className="text-sm font-medium text-slate-700">{config.name} Sayfası İçin Post Yaz</span>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                platform === "instagram"
                  ? "Caption yaz... #hashtag ekle 📸"
                  : platform === "linkedin"
                  ? "Profesyonel bir içerik paylaş... LinkedIn'de PDF dokümanlar yüksek erişim alır!"
                  : "Facebook sayfanız için içerik yaz..."
              }
              rows={6}
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />

            {/* Karakter sayacı */}
            <div className="flex items-center justify-between">
              <div className="flex-1 mr-3">
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverLimit ? "bg-red-500" : charPercent > 80 ? "bg-amber-400" : "bg-green-400"
                    }`}
                    style={{ width: `${charPercent}%` }}
                  />
                </div>
              </div>
              <span className={`text-xs tabular-nums ${isOverLimit ? "text-red-500 font-medium" : "text-slate-400"}`}>
                {charCount.toLocaleString("tr-TR")} / {config.maxChars.toLocaleString("tr-TR")}
              </span>
            </div>
          </div>

          {/* Medya Yükleme */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Medya Ekle</span>
              <span className="text-xs text-slate-400">{config.acceptLabel}</span>
            </div>

            {!mediaFile ? (
              <div
                className={`p-5 transition-colors ${isDragging ? config.bg : ""}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragging ? `${config.border} ${config.bg}` : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">Dosya seç veya buraya sürükle</p>
                  <p className="text-xs text-slate-400 mt-1">{config.acceptLabel} · Maks. 50MB</p>
                  {config.requiresMedia && (
                    <p className="text-xs text-amber-600 mt-2 font-medium">
                      ⚠️ Instagram metin-only post desteklemiyor — görsel veya video zorunlu
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={config.accept}
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
            ) : (
              <div className="p-4">
                <div className={`rounded-lg border ${config.border} ${config.bg} p-3 flex items-start gap-3`}>
                  {/* Preview */}
                  {mediaPreviewUrl && mediaType?.startsWith("image/") && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={mediaPreviewUrl} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  {mediaPreviewUrl && mediaType?.startsWith("video/") && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black">
                      <video src={mediaPreviewUrl} className="w-full h-full object-cover" muted />
                    </div>
                  )}
                  {!mediaPreviewUrl && (
                    <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{mediaFile.name}</p>
                    <p className="text-xs text-slate-500">
                      {(mediaFile.size / 1024 / 1024).toFixed(1)} MB · {mediaType}
                    </p>
                    {uploadedMediaUrl && (
                      <p className="text-xs text-green-600 mt-1 font-medium">✓ Yüklendi</p>
                    )}
                  </div>
                  <button onClick={clearMedia} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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

          {/* Paylaş Butonu */}
          <Button
            onClick={handlePost}
            disabled={!canPost}
            className={`w-full h-11 text-base font-medium text-white ${config.accent}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploadingMedia ? "Medya yükleniyor..." : "Paylaşılıyor..."}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {config.name}&apos;da Paylaş
              </>
            )}
          </Button>
        </div>

        {/* ── Sağ: Önizleme ── */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Önizleme</span>
            </div>

            <div className={`p-3 ${config.previewBg}`}>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm max-w-sm mx-auto">
                {/* Platform header */}
                <div className="p-3 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    GG
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">GUBANO GÜBRE</p>
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      <p className="text-[10px] text-slate-400">Şimdi</p>
                    </div>
                  </div>
                  <Icon className={`w-4 h-4 ml-auto flex-shrink-0 ${config.iconColor}`} />
                </div>

                {/* Content */}
                {content ? (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {content}
                    </p>
                  </div>
                ) : (
                  <div className="px-3 pb-2">
                    <p className="text-xs text-slate-300 italic">Post içeriği buraya görünecek...</p>
                  </div>
                )}

                {/* Media preview */}
                {mediaPreviewUrl && mediaType?.startsWith("image/") && (
                  <div className="w-full aspect-video bg-slate-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaPreviewUrl} alt="post görsel" className="w-full h-full object-cover" />
                  </div>
                )}
                {mediaPreviewUrl && mediaType?.startsWith("video/") && (
                  <div className="w-full aspect-video bg-black overflow-hidden">
                    <video src={mediaPreviewUrl} className="w-full h-full object-cover" muted />
                  </div>
                )}
                {mediaFile && mediaType === "application/pdf" && (
                  <div className="mx-3 mb-3 p-2.5 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-[10px] text-slate-600 truncate">{mediaFile.name}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="px-3 pb-3 pt-1 border-t border-slate-50">
                  {platform === "facebook" && (
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>👍 Beğen</span><span>💬 Yorum</span><span>↗ Paylaş</span>
                    </div>
                  )}
                  {platform === "instagram" && (
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>🤍 Beğen</span><span>💬 Yorum</span><span>📤 Paylaş</span>
                    </div>
                  )}
                  {platform === "linkedin" && (
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>👍 Beğen</span><span>💬 Yorum</span><span>🔁 Paylaş</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Son Postlar */}
      {recentPosts.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">Son {config.name} Paylaşımları</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {recentPosts.map((post) => {
              const TypeIcon = POST_TYPE_ICON[post.post_type as keyof typeof POST_TYPE_ICON] || FileText;
              return (
                <div key={post.id} className="px-4 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <TypeIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{post.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {post.published_at && (
                        <span className="text-[10px] text-slate-400">
                          {formatDateTime(post.published_at)}
                        </span>
                      )}
                      <Badge
                        variant={post.status === "published" ? "success" : post.status === "failed" ? "destructive" : "secondary"}
                        className="text-[10px] py-0 h-4"
                      >
                        {post.status === "published" ? "Yayında"
                          : post.status === "failed" ? "Hata"
                          : post.status === "scheduled" ? "Zamanlandı"
                          : "Taslak"}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
