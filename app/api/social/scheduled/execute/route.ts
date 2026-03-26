import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { editApprovalMessage } from "@/lib/telegram";

export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const now = new Date().toISOString();
  let query = supabase
    .from("social_posts")
    .select("id, content, platform, telegram_message_id, media_url, media_type")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);

  if (platform) query = query.eq("platform", platform);

  const { data: pending, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "Gönderilecek post yok." });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const results: { id: string; ok: boolean; postId?: string; error?: string }[] = [];

  for (const post of pending) {
    try {
      const res = await fetch(`${appUrl}/api/social/post/${post.platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          mediaUrl: post.media_url ?? undefined,
          mediaType: post.media_type ?? undefined,
        }),
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        await supabase
          .from("social_posts")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            title: data.postId ? `post_id:${data.postId}` : post.content.substring(0, 100),
          })
          .eq("id", post.id);

        if (post.telegram_message_id) {
          await editApprovalMessage(
            post.telegram_message_id,
            `✅ *Post Yayınlandı!*\n\nPlatform: *${post.platform.toUpperCase()}*\n\n\`\`\`\n${post.content.substring(0, 200)}\n\`\`\``
          );
        }
        results.push({ id: post.id, ok: true, postId: data.postId });
      } else {
        await supabase
          .from("social_posts")
          .update({ status: "failed", error_message: data.error || "Bilinmeyen hata" })
          .eq("id", post.id);

        if (post.telegram_message_id) {
          await editApprovalMessage(
            post.telegram_message_id,
            `❌ *Post Yayınlanamadı!*\n\nHata: ${data.error || "Bilinmeyen hata"}`
          );
        }
        results.push({ id: post.id, ok: false, error: data.error });
      }
    } catch (err) {
      await supabase
        .from("social_posts")
        .update({ status: "failed", error_message: String(err) })
        .eq("id", post.id);
      results.push({ id: post.id, ok: false, error: String(err) });
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter((r) => r.ok).length, results });
}
