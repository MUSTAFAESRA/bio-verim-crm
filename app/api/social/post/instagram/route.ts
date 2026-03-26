import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 60;

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export async function POST(req: NextRequest) {
  const { content, mediaUrl, mediaType } = await req.json();

  const PAGE_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const IG_USER_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!PAGE_TOKEN || PAGE_TOKEN === "your_facebook_page_access_token") {
    return NextResponse.json(
      { error: "Facebook/Instagram token yapılandırılmamış. Ayarlar → Facebook sayfasını kontrol edin." },
      { status: 400 }
    );
  }
  if (!IG_USER_ID || IG_USER_ID === "your_instagram_business_account_id") {
    return NextResponse.json(
      { error: "Instagram Business Account ID yapılandırılmamış. Ayarlar → Facebook sayfasını kontrol edin." },
      { status: 400 }
    );
  }
  if (!mediaUrl) {
    return NextResponse.json(
      { error: "Instagram metin-only post desteklemiyor. Lütfen bir görsel veya video ekleyin." },
      { status: 400 }
    );
  }
  if (!mediaType?.startsWith("image/") && !mediaType?.startsWith("video/")) {
    return NextResponse.json(
      { error: "Instagram sadece JPG, PNG ve MP4 formatlarını destekler." },
      { status: 400 }
    );
  }

  try {
    const isVideo = mediaType.startsWith("video/");

    // Adım 1: Media container oluştur
    const containerBody: Record<string, string> = {
      caption: content,
      access_token: PAGE_TOKEN,
    };
    if (isVideo) {
      containerBody.media_type = "REELS";
      containerBody.video_url = mediaUrl;
      containerBody.share_to_feed = "true";
    } else {
      containerBody.image_url = mediaUrl;
    }

    const containerRes = await fetch(`${GRAPH_BASE}/${IG_USER_ID}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerBody),
    });
    const containerData = await containerRes.json();

    if (!containerRes.ok || containerData.error || !containerData.id) {
      return NextResponse.json(
        { error: containerData.error?.message || "Instagram medya container oluşturulamadı." },
        { status: 500 }
      );
    }

    const creationId = containerData.id;

    // Video için işleme süresini bekle
    if (isVideo) {
      await waitForVideoProcessing(IG_USER_ID, creationId, PAGE_TOKEN);
    }

    // Adım 2: Yayınla
    const publishRes = await fetch(`${GRAPH_BASE}/${IG_USER_ID}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: PAGE_TOKEN,
      }),
    });
    const publishData = await publishRes.json();

    if (!publishRes.ok || publishData.error) {
      return NextResponse.json(
        { error: publishData.error?.message || "Instagram post yayınlanamadı." },
        { status: 500 }
      );
    }

    const postId = publishData.id;

    // DB'ye kaydet
    await saveToDb("instagram", content, mediaUrl, mediaType, postId);

    return NextResponse.json({ ok: true, postId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function waitForVideoProcessing(_igUserId: string, creationId: string, token: string, maxWaitMs = 50000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(
      `${GRAPH_BASE}/${creationId}?fields=status_code&access_token=${token}`
    );
    const data = await res.json();
    if (data.status_code === "FINISHED") return;
    if (data.status_code === "ERROR") throw new Error("Instagram video işleme hatası: " + (data.error?.message || "bilinmeyen"));
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("Instagram video işleme zaman aşımı (50s). Daha kısa video deneyin.");
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

  const postType = mediaType?.startsWith("video/") ? "video" : "image";

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
