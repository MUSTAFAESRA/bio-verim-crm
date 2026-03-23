import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, CheckCircle, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSocialPost, updatePostStatus, deleteSocialPost } from "@/actions/social-posts";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_POST_TYPE_LABELS, SOCIAL_POST_STATUS_LABELS } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/utils";

const selectClass = "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600";

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: "💼",
  facebook: "📘",
  instagram: "📸",
  youtube: "▶️",
};

const STATUS_VARIANT: Record<string, "secondary" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  scheduled: "warning",
  published: "success",
  cancelled: "destructive",
};

interface PageProps {
  searchParams: Promise<{ platform?: string; status?: string }>;
}

export default async function SosyalMedyaPage({ searchParams }: PageProps) {
  const { platform, status } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("social_posts").select("*").order("created_at", { ascending: false });
  if (platform && platform !== "all") query = query.eq("platform", platform);
  if (status && status !== "all") query = query.eq("status", status);

  const { data: postsRaw } = await query;
  const posts = (postsRaw ?? []) as Array<{
    id: string; platform: string; post_type: string; title: string; content: string;
    media_url: string | null; scheduled_at: string | null; published_at: string | null;
    status: string; created_at: string;
  }>;

  const activePlatform = platform || "all";
  const activeStatus = status || "all";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/iletisim"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Sosyal Medya Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-0.5">Post taslakları oluşturun, zamanlayın ve takip edin</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {["all", "linkedin", "facebook", "instagram", "youtube"].map(p => (
            <Link
              key={p}
              href={`/iletisim/sosyal-medya?platform=${p}&status=${activeStatus}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activePlatform === p ? "bg-green-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p === "all" ? "Tümü" : `${PLATFORM_ICONS[p]} ${SOCIAL_PLATFORM_LABELS[p]}`}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 ml-2">
          {["all", "draft", "scheduled", "published"].map(s => (
            <Link
              key={s}
              href={`/iletisim/sosyal-medya?platform=${activePlatform}&status=${s}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeStatus === s ? "bg-slate-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "Tüm Durumlar" : SOCIAL_POST_STATUS_LABELS[s]}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List */}
        <div className="lg:col-span-2 space-y-3">
          {posts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">Henüz post eklenmedi</p>
            </div>
          ) : (
            posts.map(post => (
              <Card key={post.id} className={post.status === "draft" ? "border-amber-200" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-800">
                          {PLATFORM_ICONS[post.platform]} {post.title}
                        </span>
                        <Badge variant={STATUS_VARIANT[post.status] ?? "secondary"} className="text-xs">
                          {SOCIAL_POST_STATUS_LABELS[post.status] ?? post.status}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {SOCIAL_POST_TYPE_LABELS[post.post_type] ?? post.post_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 whitespace-pre-line line-clamp-3 mb-2">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {post.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDateTime(post.scheduled_at)}
                          </span>
                        )}
                        {post.published_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" /> {formatDateTime(post.published_at)}
                          </span>
                        )}
                        {!post.scheduled_at && !post.published_at && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {formatDate(post.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {post.status === "draft" && (
                        <form action={updatePostStatus.bind(null, post.id, "scheduled")}>
                          <button type="submit" className="text-xs text-amber-600 hover:text-amber-800 whitespace-nowrap px-2 py-1 rounded border border-amber-200 hover:bg-amber-50">
                            Zamanla
                          </button>
                        </form>
                      )}
                      {(post.status === "draft" || post.status === "scheduled") && (
                        <form action={updatePostStatus.bind(null, post.id, "published")}>
                          <button type="submit" className="text-xs text-green-600 hover:text-green-800 whitespace-nowrap px-2 py-1 rounded border border-green-200 hover:bg-green-50">
                            Yayına Al
                          </button>
                        </form>
                      )}
                      <form action={deleteSocialPost.bind(null, post.id)}>
                        <button type="submit" className="text-slate-400 hover:text-red-500 flex justify-center">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* New Post Form */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Yeni Post Oluştur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createSocialPost} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Başlık *</Label>
                  <Input name="title" placeholder="Post başlığı" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Platform(lar) *</Label>
                  <div className="space-y-1">
                    {["linkedin", "facebook", "instagram", "youtube"].map(p => (
                      <label key={p} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" name="platform" value={p} className="rounded" />
                        {PLATFORM_ICONS[p]} {SOCIAL_PLATFORM_LABELS[p]}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Post Tipi</Label>
                  <select name="post_type" className={selectClass}>
                    <option value="urun_tanitim">Ürün Tanıtımı</option>
                    <option value="kampanya">Kampanya</option>
                    <option value="genel">Genel İçerik</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">İçerik *</Label>
                  <Textarea name="content" placeholder="Post metni, hashtagler..." rows={5} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Medya URL (opsiyonel)</Label>
                  <Input name="media_url" placeholder="https://..." type="url" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Yayın Tarihi (opsiyonel)</Label>
                  <Input name="scheduled_at" type="datetime-local" />
                  <p className="text-xs text-slate-400">Boş bırakılırsa taslak olarak kaydedilir.</p>
                </div>
                <Button type="submit" size="sm" className="w-full">Post Oluştur</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
