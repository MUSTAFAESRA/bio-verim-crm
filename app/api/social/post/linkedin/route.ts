import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const LI_REST = "https://api.linkedin.com/rest";
const LI_VERSION = "202504";

export async function POST(req: NextRequest) {
  const { content, mediaUrl, mediaType } = await req.json();

  const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
  const PERSON_ID = process.env.LINKEDIN_PERSON_ID;
  const ORG_ID = process.env.LINKEDIN_ORGANIZATION_ID;

  if (!ACCESS_TOKEN || ACCESS_TOKEN === "your_linkedin_access_token") {
    return NextResponse.json(
      { error: "LinkedIn Access Token yapılandırılmamış. Ayarlar → LinkedIn sayfasını kontrol edin." },
      { status: 400 }
    );
  }
  if (!PERSON_ID && !ORG_ID) {
    return NextResponse.json(
      { error: "LinkedIn Person ID veya Organization ID yapılandırılmamış." },
      { status: 400 }
    );
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Post içeriği boş olamaz." }, { status: 400 });
  }

  // Şirket sayfası varsa onu kullan, yoksa kişisel profil
  const author = ORG_ID && ORG_ID !== "your_linkedin_organization_id"
    ? `urn:li:organization:${ORG_ID}`
    : `urn:li:person:${PERSON_ID}`;

  try {
    // Medya yükleme (yeni REST API formatı)
    let mediaContent: Record<string, unknown> | undefined;

    if (mediaUrl) {
      if (mediaType?.startsWith("image/")) {
        const imageUrn = await uploadImage(author, mediaUrl, mediaType, ACCESS_TOKEN);
        if (imageUrn) {
          mediaContent = { media: { id: imageUrn } };
        }
      } else if (mediaType === "application/pdf") {
        const docUrn = await uploadDocument(author, mediaUrl, ACCESS_TOKEN);
        if (docUrn) {
          mediaContent = { media: { id: docUrn } };
        }
      }
      // Video: URL'yi metne ekle (video upload ayrı flow gerektirir)
    }

    const commentary = mediaUrl && mediaType?.startsWith("video/")
      ? `${content}\n\n🎬 ${mediaUrl}`
      : content;

    const postBody: Record<string, unknown> = {
      author,
      commentary,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    if (mediaContent) {
      postBody.content = mediaContent;
    }

    const res = await fetch(`${LI_REST}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "LinkedIn-Version": LI_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    const responseText = await res.text();

    if (!res.ok) {
      let errMsg = "LinkedIn post paylaşılamadı.";
      let parsedError: Record<string,unknown> = {};
      try {
        parsedError = JSON.parse(responseText);
        if ((parsedError as any).code === "DUPLICATE_POST") {
          errMsg = "Bu içerik zaten paylaşılmış. Lütfen farklı bir metin girin.";
        } else {
          errMsg = (parsedError as any).message || (parsedError as any).errorDetails?.inputErrors?.[0]?.description || errMsg;
        }
      } catch {}

      // Org yetkisi yoksa kişisel profile otomatik fall back
      const isOrgAuthor = author.includes("organization");
      const isOrgPermErr = errMsg.toLowerCase().includes("organization permission");
      if (isOrgAuthor && isOrgPermErr && PERSON_ID) {
        const fallbackAuthor = `urn:li:person:${PERSON_ID}`;
        const fallbackBody = { ...postBody, author: fallbackAuthor };
        if (mediaContent) {
          const imgUrn = await uploadImage(fallbackAuthor, mediaUrl!, mediaType!, ACCESS_TOKEN!);
          fallbackBody.content = imgUrn ? { media: { id: imgUrn } } : undefined as any;
        }
        const res2 = await fetch(`${LI_REST}/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}`, "LinkedIn-Version": LI_VERSION, "X-Restli-Protocol-Version": "2.0.0" },
          body: JSON.stringify(fallbackBody),
        });
        if (res2.ok) {
          const postId2 = res2.headers.get("x-restli-id") || res2.headers.get("location") || null;
          await saveToDb("linkedin", content, mediaUrl, mediaType, postId2);
          return NextResponse.json({ ok: true, postId: postId2, note: "Kişisel profil üzerinden paylaşıldı (org token yetkisi eksik)" });
        }
      }

      return NextResponse.json({ error: `LinkedIn API Hatası: ${errMsg}` }, { status: 500 });
    }

    const postId = res.headers.get("x-restli-id") || res.headers.get("location") || null;

    await saveToDb("linkedin", content, mediaUrl, mediaType, postId);

    return NextResponse.json({ ok: true, postId });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** Resim yükleme — /rest/images */
async function uploadImage(
  owner: string,
  assetUrl: string,
  mimeType: string,
  token: string
): Promise<string | null> {
  try {
    // Adım 1: Upload başlat
    const initRes = await fetch(`${LI_REST}/images?action=initializeUpload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": LI_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner },
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok || !initData.value) return null;

    const uploadUrl: string = initData.value.uploadUrl;
    const imageUrn: string = initData.value.image;
    if (!uploadUrl || !imageUrn) return null;

    // Adım 2: Dosyayı çek ve yükle
    const fileRes = await fetch(assetUrl);
    if (!fileRes.ok) return null;
    const fileBuffer = await fileRes.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        Authorization: `Bearer ${token}`,
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) return null;
    return imageUrn;
  } catch {
    return null;
  }
}

/** PDF doküman yükleme — /rest/documents */
async function uploadDocument(
  owner: string,
  assetUrl: string,
  token: string
): Promise<string | null> {
  try {
    // Adım 1: Upload başlat
    const initRes = await fetch(`${LI_REST}/documents?action=initializeUpload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "LinkedIn-Version": LI_VERSION,
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        initializeUploadRequest: { owner },
      }),
    });
    const initData = await initRes.json();
    if (!initRes.ok || !initData.value) return null;

    const uploadUrl: string = initData.value.uploadUrl;
    const documentUrn: string = initData.value.document;
    if (!uploadUrl || !documentUrn) return null;

    // Adım 2: Dosyayı çek ve yükle
    const fileRes = await fetch(assetUrl);
    if (!fileRes.ok) return null;
    const fileBuffer = await fileRes.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
        Authorization: `Bearer ${token}`,
      },
      body: fileBuffer,
    });

    if (!uploadRes.ok) return null;
    return documentUrn;
  } catch {
    return null;
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
