import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendApprovalMessage, isTelegramConfigured } from "@/lib/telegram";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET — Platforma göre zamanlanmış postları listele
export async function GET(req: NextRequest) {
  const platform = req.nextUrl.searchParams.get("platform") || "linkedin";
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("social_posts")
    .select("id, platform, content, scheduled_at, status, title, post_type, error_message, created_at, telegram_message_id, media_url, media_type")
    .eq("platform", platform)
    .in("status", ["scheduled", "pending_approval", "failed"])
    .order("scheduled_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

// POST — Yeni zamanlanmış post kaydet + Telegram onay gönder
export async function POST(req: NextRequest) {
  const { content, instruction, scheduledAt, platform = "linkedin", mediaUrl, mediaType } = await req.json();

  if (!content?.trim()) return NextResponse.json({ error: "İçerik boş olamaz." }, { status: 400 });
  if (!scheduledAt) return NextResponse.json({ error: "Yayın tarihi seçilmedi." }, { status: 400 });
  if (new Date(scheduledAt) <= new Date()) return NextResponse.json({ error: "Yayın tarihi geçmişte olamaz." }, { status: 400 });

  const supabase = getSupabase();

  // post_type'ı medya tipine göre belirle
  const postType = mediaType
    ? mediaType.startsWith("image/") ? "image"
    : mediaType.startsWith("video/") ? "video"
    : mediaType === "application/pdf" ? "document"
    : "text"
    : "text";

  // pending_approval → scheduled olarak kaydet
  // (Telegram onayı geldikten sonra execute edilir; telegram_message_id set edilmemiş olanlar execute'tan muaf)
  // NOT: "pending_approval" DB constraint'te yoksa "scheduled" kullanılır ama telegram_message_id null kalır,
  //       onay mesajı geldikten SONRA telegram_message_id set edilir → execute route media_url ile çalışır.
  let insertStatus: string = isTelegramConfigured() ? "pending_approval" : "scheduled";

  // Önce pending_approval ile dene, constraint hatası gelirse scheduled kullan
  let { data, error } = await supabase
    .from("social_posts")
    .insert({
      platform,
      post_type: postType,
      content,
      title: instruction?.trim() || content.substring(0, 100),
      scheduled_at: scheduledAt,
      status: insertStatus,
      ...(mediaUrl ? { media_url: mediaUrl } : {}),
      ...(mediaType ? { media_type: mediaType } : {}),
    })
    .select("id")
    .single();

  // Constraint hatası → "pending_approval" desteklenmiyor, "scheduled" ile tekrar dene
  if (error && error.code === "23514") {
    insertStatus = "scheduled";
    const retry = await supabase
      .from("social_posts")
      .insert({
        platform,
        post_type: postType,
        content,
        title: instruction?.trim() || content.substring(0, 100),
        scheduled_at: scheduledAt,
        status: "scheduled",
        ...(mediaUrl ? { media_url: mediaUrl } : {}),
        ...(mediaType ? { media_type: mediaType } : {}),
      })
      .select("id")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Telegram onay mesajı gönder
  if (isTelegramConfigured() && data) {
    const msgId = await sendApprovalMessage({
      postId: data.id,
      platform,
      content,
      scheduledAt,
      instruction,
      mediaUrl: mediaUrl ?? null,
    });

    if (msgId) {
      await supabase
        .from("social_posts")
        .update({ telegram_message_id: msgId })
        .eq("id", data.id);
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      pendingApproval: true,
      message: "📱 Telegram'a onay isteği gönderildi. Onayladıktan sonra zamanlanacak.",
    });
  }

  return NextResponse.json({ ok: true, id: data.id, pendingApproval: false });
}

// DELETE — Zamanlanmış postu iptal et
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "ID gerekli." }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", id)
    .in("status", ["scheduled", "pending_approval", "failed"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
