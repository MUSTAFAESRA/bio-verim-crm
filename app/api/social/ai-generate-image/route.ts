import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function buildImagePrompt(topic: string, platform: string): string {
  const platformStyle: Record<string, string> = {
    instagram:
      "Vibrant, colorful, Instagram-worthy square composition. High contrast, beautiful natural lighting.",
    facebook:
      "Warm and welcoming horizontal agricultural scene. Community-focused, bright colors.",
    linkedin:
      "Professional, clean, corporate agricultural imagery. Horizontal format, minimal and modern.",
  };

  const style = platformStyle[platform] || platformStyle.linkedin;

  return (
    `Professional agricultural marketing photo for a Turkish fertilizer company called GUBANO GUBRE. ` +
    `Theme: ${topic}. ` +
    `Show: lush green fields, healthy crops, modern farming, rich soil, or fertilizer application. ` +
    `${style} ` +
    `Photorealistic, high quality, no text overlays, no logos. ` +
    `Colors: deep greens, warm browns, golden sunlight. Turkish agricultural landscape style.`
  );
}

async function ensureBucket(supabase: ReturnType<typeof createClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b) => b.name === "social-media")) {
    await supabase.storage.createBucket("social-media", {
      public: true,
      fileSizeLimit: 52428800,
    });
  }
}

async function uploadBase64Image(
  supabase: ReturnType<typeof createClient>,
  base64: string,
  mimeType: string
): Promise<string | null> {
  const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";
  const storagePath = `posts/ai-img-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await ensureBucket(supabase);

  const buffer = Buffer.from(base64, "base64");
  const { error } = await supabase.storage
    .from("social-media")
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

  if (error) return null;

  const { data } = supabase.storage.from("social-media").getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function POST(req: NextRequest) {
  const { topic, platform = "instagram" } = await req.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: "Konu boş olamaz." }, { status: 400 });
  }

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY tanımlı değil." }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const prompt = buildImagePrompt(topic, platform);

  // ── 1. Gemini Imagen 3 dene ──────────────────────────────────────────
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: platform === "linkedin" || platform === "facebook" ? "16:9" : "1:1" },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const prediction = data.predictions?.[0];
      const base64 = prediction?.bytesBase64Encoded;
      const mimeType = prediction?.mimeType || "image/png";

      if (base64) {
        const url = await uploadBase64Image(supabase, base64, mimeType);
        if (url) {
          return NextResponse.json({ ok: true, url, mediaType: mimeType, model: "Imagen 3" });
        }
      }
    }
  } catch {
    // Imagen başarısız → sonraki yönteme geç
  }

  // ── 2. Gemini 2.0 Flash image generation dene ────────────────────────
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData);

      if (imgPart?.inlineData) {
        const base64 = imgPart.inlineData.data;
        const mimeType = imgPart.inlineData.mimeType || "image/png";
        const url = await uploadBase64Image(supabase, base64, mimeType);
        if (url) {
          return NextResponse.json({ ok: true, url, mediaType: mimeType, model: "Gemini 2.0 Flash" });
        }
      }
    }
  } catch {
    // Flash image generation başarısız
  }

  // ── 3. Pexels stok fotoğraf (ücretsiz fallback) ──────────────────────
  const PEXELS_KEY = process.env.PEXELS_API_KEY;
  if (PEXELS_KEY) {
    try {
      const keywords = extractKeywords(topic);
      const query = encodeURIComponent(keywords);
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=5&orientation=${
          platform === "instagram" ? "square" : "landscape"
        }`,
        { headers: { Authorization: PEXELS_KEY } }
      );

      if (res.ok) {
        const data = await res.json();
        const photo = data.photos?.[0];
        if (photo) {
          const imgUrl = platform === "instagram" ? photo.src.medium : photo.src.large;
          // Pexels görseli indir ve Supabase'e yükle
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            const arrayBuffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            const url = await uploadBase64Image(supabase, base64, "image/jpeg");
            if (url) {
              return NextResponse.json({ ok: true, url, mediaType: "image/jpeg", model: "Pexels" });
            }
          }
        }
      }
    } catch {
      // Pexels başarısız
    }
  }

  return NextResponse.json(
    { error: "Görsel üretilemedi. Gemini API kotası dolmuş olabilir veya PEXELS_API_KEY eklenmemiş." },
    { status: 500 }
  );
}

function extractKeywords(topic: string): string {
  // Türkçe → İngilizce tarım kelimeleri
  const map: Record<string, string> = {
    gübre: "fertilizer",
    organik: "organic farming",
    tarım: "agriculture",
    çiftçi: "farmer",
    toprak: "soil",
    mahsul: "crop harvest",
    bitki: "plant growth",
    verim: "crop yield",
    kampanya: "agriculture field",
    bahar: "spring farming",
    yaz: "summer farm",
    hasat: "harvest",
    ürün: "farm produce",
    doğal: "natural farming",
    biyolojik: "biological farming",
  };

  let result = topic.toLowerCase();
  for (const [tr, en] of Object.entries(map)) {
    result = result.replace(new RegExp(tr, "gi"), en);
  }

  // İlk 3-4 kelimeyi al
  const words = result.split(/\s+/).slice(0, 4).join(" ");
  return words || "agriculture farming Turkey";
}
