import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export async function POST(req: NextRequest) {
  const { content, mediaUrl, mediaType } = await req.json();

  const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;

  if (!PAGE_TOKEN || PAGE_TOKEN === "your_facebook_page_access_token") {
    return NextResponse.json(
      { error: "Facebook Page Access Token yapılandırılmamış. Ayarlar → Facebook sayfasını kontrol edin." },
      { status: 400 }
    );
  }
  if (!PAGE_ID || PAGE_ID === "your_facebook_page_id") {
    return NextResponse.json(
      { error: "Facebook Page ID yapılandırılmamış. Ayarlar → Facebook sayfasını kontrol edin." },
      { status: 400 }
    );
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Post içeriği boş olamaz." }, { status: 400 });
  }

  try {
    let postId: string | null = null;

    if (mediaUrl && mediaType?.startsWith("image/")) {
      // Photo post
      const res = await fetch(`${GRAPH_BASE}/${PAGE_ID}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: mediaUrl,
          caption: content,
          access_token: PAGE_TOKEN,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return NextResponse.json({ error: data.error?.message || "Fotoğraf paylaşılamadı." }, { status: 500 });
      }
      postId = data.post_id || data.id;
    } else if (mediaUrl && mediaType?.startsWith("video/")) {
      // Video post
      const res = await fetch(`${GRAPH_BASE}/${PAGE_ID}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: mediaUrl,
          description: content,
          access_token: PAGE_TOKEN,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return NextResponse.json({ error: data.error?.message || "Video paylaşılamadı." }, { status: 500 });
      }
      postId = data.id;
    } else {
      // Text post (with optional PDF/document link)
      const message = mediaUrl ? `${content}\n\n📎 ${mediaUrl}` : content;
      const res = await fetch(`${GRAPH_BASE}/${PAGE_ID}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          access_token: PAGE_TOKEN,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        return NextResponse.json({ error: data.error?.message || "Post paylaşılamadı." }, { status: 500 });
      }
      postId = data.id;
    }

    // DB'ye kaydet
    await saveToDb("facebook", content, mediaUrl, mediaType, postId);

    return NextResponse.json({ ok: true, postId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function saveToDb(
  platform: string,
  content: string,
  mediaUrl: string | null,
  mediaType: string | null,
  platformPostId: string | null
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const postType = mediaType
    ? mediaType.startsWith("image/") ? "image"
    : mediaType.startsWith("video/") ? "video"
    : "document"
    : "text";

  await supabase.from("social_posts").insert({
    platform,
    post_type: postType,
    content,
    media_url: mediaUrl || null,
    title: platformPostId ? `post_id:${platformPostId}` : content.substring(0, 100),
    status: "published",
    published_at: new Date().toISOString(),
  } as any);
}
