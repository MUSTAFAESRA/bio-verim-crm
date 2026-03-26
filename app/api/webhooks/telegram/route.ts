import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { editApprovalMessage, answerCallbackQuery } from "@/lib/telegram";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Inline keyboard callback
  const callbackQuery = body.callback_query;
  if (!callbackQuery) return NextResponse.json({ ok: true });

  const callbackId = callbackQuery.id;
  const data: string = callbackQuery.data || "";
  const messageId = String(callbackQuery.message?.message_id);

  const [action, postId] = data.split(":");
  if (!postId) {
    await answerCallbackQuery(callbackId, "❌ Geçersiz işlem");
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabase();

  // Post'u veritabanından çek
  const { data: post, error } = await supabase
    .from("social_posts")
    .select("id, content, platform, status, scheduled_at, media_url, media_type")
    .eq("id", postId)
    .single();

  if (error || !post) {
    await answerCallbackQuery(callbackId, "❌ Post bulunamadı veya zaten işlendi.");
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    // Onayla → scheduled olarak işaretle
    await supabase
      .from("social_posts")
      .update({ status: "scheduled" })
      .eq("id", postId);

    await answerCallbackQuery(callbackId, "✅ Onaylandı! Post zamanlandı.");
    await editApprovalMessage(
      messageId,
      `✅ *ONAYLANDI - Zamanlandı*\n\nPlatform: *${post.platform.toUpperCase()}*\n⏰ ${new Date(post.scheduled_at).toLocaleString("tr-TR")}\n\n\`\`\`\n${post.content.substring(0, 200)}\n\`\`\``
    );

    // Eğer zamanı geçmişse hemen yayınla
    if (post.scheduled_at && new Date(post.scheduled_at) <= new Date()) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${appUrl}/api/social/post/${post.platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: post.content,
          mediaUrl: post.media_url ?? undefined,
          mediaType: post.media_type ?? undefined,
        }),
      });
      const result = await res.json();
      if (res.ok && result.ok) {
        await supabase
          .from("social_posts")
          .update({ status: "published", published_at: new Date().toISOString() })
          .eq("id", postId);
        await editApprovalMessage(
          messageId,
          `🚀 *YAYINLANDI!*\n\nPlatform: *${post.platform.toUpperCase()}*\n\n\`\`\`\n${post.content.substring(0, 200)}\n\`\`\``
        );
      } else {
        const errMsg = result?.error || "Bilinmeyen hata";
        await supabase
          .from("social_posts")
          .update({ status: "failed", error_message: errMsg })
          .eq("id", postId);
        await editApprovalMessage(
          messageId,
          `❌ *YAYINLANAMADI!*\n\nPlatform: *${post.platform.toUpperCase()}*\nHata: ${errMsg}`
        );
      }
    }
  } else if (action === "reject") {
    // Reddet → rejected olarak işaretle
    await supabase
      .from("social_posts")
      .update({ status: "failed", error_message: "Telegram'dan reddedildi" })
      .eq("id", postId);

    await answerCallbackQuery(callbackId, "❌ Post reddedildi.");
    await editApprovalMessage(
      messageId,
      `❌ *REDDEDİLDİ*\n\nPlatform: *${post.platform.toUpperCase()}*\n\n\`\`\`\n${post.content.substring(0, 200)}\n\`\`\``
    );
  }

  return NextResponse.json({ ok: true });
}

// GET — Webhook doğrulama (opsiyonel)
export async function GET() {
  return NextResponse.json({ ok: true, service: "BioVerim Telegram Webhook" });
}
