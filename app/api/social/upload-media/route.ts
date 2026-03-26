import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Dosya seçilmedi." }, { status: 400 });
  }

  const ALLOWED = [
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/quicktime",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: `Desteklenmeyen dosya formatı: ${file.type}` }, { status: 400 });
  }

  // Max 50MB
  if (file.size > 52428800) {
    return NextResponse.json({ error: "Dosya boyutu 50MB'ı aşıyor." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const timestamp = Date.now();
  const storagePath = `posts/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Bucket yoksa otomatik oluştur (public — Instagram için public URL gerekli)
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((b) => b.name === "social-media");
  if (!bucketExists) {
    await supabase.storage.createBucket("social-media", { public: true, fileSizeLimit: 52428800 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("social-media")
    .upload(storagePath, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = supabase.storage
    .from("social-media")
    .getPublicUrl(storagePath);

  return NextResponse.json({
    ok: true,
    path: storagePath,
    url: publicData.publicUrl,
    mediaType: file.type,
  });
}
