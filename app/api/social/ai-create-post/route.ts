import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel/Next.js edge timeout — uzun AI çağrıları için
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
// Türkçe tarih/saat ifadelerinden scheduledAt üret
// ─────────────────────────────────────────────────────────────
function parseTimeFromInstruction(instruction: string): {
  scheduledAt: string;
  scheduleMode: "once" | "weekly" | "monthly";
  scheduleLabel: string;
  weekdays?: number[];
  weekCount?: number;
  monthDay?: number;
  monthCount?: number;
} {
  const lower = instruction.toLowerCase();
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) =>
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;

  // Saat çıkar — "saat 9", "9:30", "akşam 7'de", "sabah 8de", "10da" formatlarını destekler
  let hour = 9, minute = 0;
  const timeMatch = lower.match(/saat\s+(\d{1,2})(?:[:.:](\d{2}))?|(\d{1,2})[:.:](\d{2})/);
  const apostropheMatch = lower.match(/(\d{1,2})'?[dt][aeı]/);

  if (timeMatch) {
    hour = parseInt(timeMatch[1] || timeMatch[3] || "9");
    minute = parseInt(timeMatch[2] || timeMatch[4] || "0");
  } else if (apostropheMatch) {
    hour = parseInt(apostropheMatch[1]);
  }

  const hasEvening = lower.includes("akşam") || lower.includes("gece");
  const hasMorning = lower.includes("sabah");
  const hasNoon = lower.includes("öğle");

  if (!timeMatch && !apostropheMatch) {
    if (hasMorning) { hour = 9; }
    else if (lower.includes("öğleden sonra")) { hour = 14; }
    else if (hasNoon) { hour = 12; }
    else if (lower.includes("akşam")) { hour = 20; }
    else if (lower.includes("gece")) { hour = 22; }
  } else if (apostropheMatch || timeMatch) {
    const hasAfternoon = lower.includes("öğleden sonra") || lower.includes("öğle");
    if (hasEvening && hour < 12) hour += 12;
    else if (hasAfternoon && hour < 12) hour += 12;
    else if (hasMorning && hour === 12) hour = 0;
  }

  // Haftalık mı?
  const weeklyMatch = lower.match(/haftal[ıi]k|her\s+(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)/);
  if (weeklyMatch) {
    const dayMap: Record<string, number> = { pazartesi: 1, salı: 2, çarşamba: 3, perşembe: 4, cuma: 5, cumartesi: 6, pazar: 0 };
    const weekdays: number[] = [];
    for (const [name, num] of Object.entries(dayMap)) {
      if (lower.includes(name)) weekdays.push(num);
    }
    if (weekdays.length === 0) weekdays.push(1);
    const weekCountMatch = lower.match(/(\d+)\s*hafta/);
    const weekCount = weekCountMatch ? parseInt(weekCountMatch[1]) : 4;
    const d = new Date(now);
    d.setDate(d.getDate() + ((weekdays[0] - d.getDay() + 7) % 7 || 7));
    d.setHours(hour, minute, 0, 0);
    return { scheduledAt: iso(d), scheduleMode: "weekly", weekdays, weekCount, scheduleLabel: `Her hafta ${hour}:${p(minute)} - ${weekCount} hafta` };
  }

  // Aylık mı?
  const monthlyMatch = lower.match(/aylık|her\s+ayın?\s+(\d{1,2})/);
  if (monthlyMatch) {
    const monthDay = monthlyMatch[1] ? parseInt(monthlyMatch[1]) : 1;
    const monthCountMatch = lower.match(/(\d+)\s*ay/);
    const monthCount = monthCountMatch ? parseInt(monthCountMatch[1]) : 3;
    const d = new Date(now.getFullYear(), now.getMonth(), monthDay, hour, minute, 0);
    if (d <= now) d.setMonth(d.getMonth() + 1);
    return { scheduledAt: iso(d), scheduleMode: "monthly", monthDay, monthCount, scheduleLabel: `Her ayın ${monthDay}. günü ${hour}:${p(minute)} - ${monthCount} ay` };
  }

  // Belirli gün
  const dayMap: Record<string, number> = { pazartesi: 1, salı: 2, çarşamba: 3, perşembe: 4, cuma: 5, cumartesi: 6, pazar: 0 };
  for (const [name, num] of Object.entries(dayMap)) {
    if (lower.includes(name)) {
      const d = new Date(now);
      d.setDate(d.getDate() + ((num - d.getDay() + 7) % 7 || 7));
      d.setHours(hour, minute, 0, 0);
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      return { scheduledAt: iso(d), scheduleMode: "once", scheduleLabel: `${label} ${hour}:${p(minute)}` };
    }
  }

  // Bugün
  if (lower.includes("bugün")) {
    const d = new Date(now);
    d.setHours(hour, minute, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return { scheduledAt: iso(d), scheduleMode: "once", scheduleLabel: `Bugün ${hour}:${p(minute)}` };
  }

  // N saat sonra
  const hoursLaterMatch = lower.match(/(\d+)\s*saat\s+sonra/);
  if (hoursLaterMatch) {
    const d = new Date(now.getTime() + parseInt(hoursLaterMatch[1]) * 3600000);
    return { scheduledAt: iso(d), scheduleMode: "once", scheduleLabel: `${hoursLaterMatch[1]} saat sonra` };
  }

  // Varsayılan: yarın saptanan saatte
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return { scheduledAt: iso(d), scheduleMode: "once", scheduleLabel: `Yarın ${hour}:${p(minute)}` };
}

// ─────────────────────────────────────────────────────────────
// Görsel gerekli mi? — Tüm platformlar için her zaman true
// ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function needsImageCheck(_instruction: string, _platform: string): boolean {
  return true; // Instagram, LinkedIn, Facebook — hepsinde görsel üret
}

// ─────────────────────────────────────────────────────────────
// Zaman aşımı ile fetch yardımcısı (ms)
// ─────────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ─────────────────────────────────────────────────────────────
// Talimatdan keyword çıkar (şablon için)
// ─────────────────────────────────────────────────────────────
function extractKeyword(instruction: string): string {
  const lower = instruction.toLowerCase();
  const keywordMap: Array<[string[], string]> = [
    [["buğday", "tahıl", "ekmek"], "buğday tarlaları"],
    [["mısır", "silaj"], "mısır üretimi"],
    [["domates", "biber", "salatalık", "sebze"], "sebze bahçeleri"],
    [["ayçiçeği", "çiçek"], "ayçiçeği tarlaları"],
    [["pamuk"], "pamuk üretimi"],
    [["üzüm", "bağ", "asma"], "bağ ve bahçe"],
    [["zeytin"], "zeytin bahçeleri"],
    [["patates", "soğan", "sarımsak"], "kök sebze tarımı"],
    [["meyve", "elma", "armut", "kiraz", "vişne"], "meyve bahçeleri"],
    [["toprak", "verimlilik", "humus"], "toprak sağlığı"],
    [["organik", "doğal", "biyolojik"], "organik tarım"],
    [["hasat", "mahsul", "ürün toplama"], "hasat sezonu"],
    [["ekim", "tohum", "fide"], "ekim sezonu"],
    [["kampanya", "indirim", "fırsat", "özel"], "özel kampanya"],
    [["gübre", "besin", "mineral"], "gübre çözümleri"],
  ];
  for (const [keys, label] of keywordMap) {
    if (keys.some(k => lower.includes(k))) return label;
  }
  return "tarımsal üretim";
}

// ─────────────────────────────────────────────────────────────
// Marka bağlamı + platform/ton rehberi ile prompt oluştur
// ─────────────────────────────────────────────────────────────
function buildPrompt(instruction: string, platform: string, tone: string): string {
  const platformGuide: Record<string, string> = {
    instagram: `Platform: Instagram.
Kural: 120-180 kelime. Satır başları ile okunabilir yap. Bol emoji kullan (her paragrafta).
Sonuna 15-20 hashtag ekle: marka + ürün + tarım temaları (#GUBANO #organikgübre #tarım #verim #çiftçi #toprak #hasat vs.).
İlk cümle dikkat çekici ve güçlü olsun.`,
    facebook: `Platform: Facebook.
Kural: 150-250 kelime. Samimi ve konuşma dili. 2-3 emoji yeterli.
Okuyucuya soru sor (yorum almak için). Sonuna 5-8 hashtag.
CTA: "Yorum yap", "Bizi ara", "Web sitemizi ziyaret et".`,
    linkedin: `Platform: LinkedIn.
Kural: 200-350 kelime. Profesyonel ama insan dili. Minimum emoji.
Güçlü bir çarpıcı ilk satır (hook). İstatistik veya somut fayda vurgusu.
3-5 profesyonel hashtag. CTA: "Daha fazla bilgi için mesaj atın."`,
  };
  const toneGuide: Record<string, string> = {
    profesyonel: "Otoriter, güvenilir, sektör uzmanı sesi.",
    samimi: "Samimi, sıcak, çiftçinin dostu tonu. 'Siz' yerine 'sen' de kullanılabilir.",
    heyecanlı: "Enerjik, heyecanlı, motivasyonel. Ünlem işaretleri, dinamik cümleler.",
    bilgilendirici: "Eğitici, açıklayıcı, veri odaklı. Neden & nasıl sorularını yanıtla.",
    kampanya: "Fırsat vurgulu, aciliyet hissi, harekete geçirici. 'Kaçırmayın', 'Sınırlı süre' vurgusu.",
  };

  return `Sen GUBANO GÜBRE'nin kıdemli sosyal medya uzmanısın. Yalnızca Türkçe yaz.

=== MARKA BİLGİSİ ===
Marka: GUBANO GÜBRE
Ürünler: organik gübre, humic acid (humik asit), leonardite gübre, biyostimülant, toprak düzenleyici
Hedef kitle: Türk çiftçiler, tarım kooperatifleri, ziraat mühendisleri, büyük çiftlik sahipleri
Temel fayda: Toprak yapısını kalıcı iyileştirir • Kök gelişimini %40'a kadar artırır • Kimyasal gübreye bağımlılığı azaltır • Her mevsim uygulanabilir
İletişim: DM at / 0850 XXX XX XX / www.gubano.com.tr

=== GÖREV ===
Aşağıdaki talimatı anla ve bu talimatın ruhuna uygun, MARKA BİLGİSİ ile zenginleştirilmiş, özgün bir ${platform} paylaşımı yaz.
❌ Talimatı kelimesi kelimesine KOPYALAMA.
✅ Talimattaki konuyu GUBANO GÜBRE perspektifinden ele al, marka faydalarını ve ürünleri konuya uygun yere serpiştir.

=== PLATFORM & TON ===
${platformGuide[platform] || platformGuide.linkedin}
Ton: ${toneGuide[tone] || toneGuide.profesyonel}

=== TALİMAT ===
"${instruction}"

Yalnızca paylaşım metnini yaz. Hiçbir açıklama, başlık veya not ekleme.`;
}

// ─────────────────────────────────────────────────────────────
// Akıllı template fallback — anahtar kelime tabanlı
// ─────────────────────────────────────────────────────────────
function templateFallback(instruction: string, platform: string, tone: string): string {
  const toneEmoji: Record<string, string> = {
    profesyonel: "💼", samimi: "🤝", heyecanlı: "🔥", bilgilendirici: "📊", kampanya: "🎁",
  };
  const emoji = toneEmoji[tone] || "🌱";
  const keyword = extractKeyword(instruction);
  const lower = instruction.toLowerCase();

  // Kampanya/indirim tonu
  const isCampaign = lower.includes("kampanya") || lower.includes("indirim") || lower.includes("fırsat") || lower.includes("özel");
  // Bilgi/eğitim tonu
  const isInfo = lower.includes("bilgi") || lower.includes("neden") || lower.includes("nasıl") || lower.includes("ne zaman") || lower.includes("ipucu") || lower.includes("öneri");

  let openingLine = "";
  let bodyLine = "";
  let ctaLine = "";

  if (isCampaign) {
    openingLine = `${emoji} GUBANO GÜBRE'den ${keyword} için özel kampanya fırsatı!`;
    bodyLine = `Bu sezon toprağınıza en iyi yatırımı yapın. Humik asit bazlı organik gübre ürünlerimizle hem veriminizi artırın hem de toprağınızı gelecek nesillere sağlıklı bırakın.\n\nSınırlı süre için geçerli özel fiyatlarımızı kaçırmayın! ✅`;
    ctaLine = platform === "instagram"
      ? "📩 DM gönderin veya profilinizki linke tıklayın!\n\n#GUBANO #organikgübre #tarımkampanya #gübre #verim #çiftçi #toprak #hasat #doğal #tarım #organik #humicastid #biyogübre #mahsul #türkiye"
      : platform === "facebook"
      ? "📞 Hemen arayın veya yorum bırakın, detayları paylaşalım!\n#GUBANO #Kampanya #OrganikGübre #Tarım #Çiftçi"
      : "Detaylı bilgi ve sipariş için mesaj atın. 🌾\n#GUBANO #OrganikTarım #SürdürülebilirTarım #AgriTech #Gübre";
  } else if (isInfo) {
    openingLine = `${emoji} ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} hakkında bilmeniz gerekenler:`;
    bodyLine = `Doğru gübre, doğru zamanda uygulandığında fark yaratır. GUBANO'nun humik asit ve leonardite bazlı ürünleri:\n\n✅ Kök bölgesinde besin tutma kapasitesini artırır\n✅ Toprak pH'ını dengeler\n✅ Strese karşı bitkisel direnci güçlendirir\n✅ Hasat verimini maksimuma taşır`;
    ctaLine = platform === "instagram"
      ? "Daha fazlası için profildeki linke tıkla 🔗\n\n#GUBANO #tarımbilgisi #organikgübre #toprak #verim #çiftçi #ziraat #hasat #bitki #doğal #tarım #humicastid #agri #mahsul #sürdürülebilir"
      : platform === "facebook"
      ? "Sorularınızı yoruma yazın, uzmanlarımız yanıtlasın! 👇\n#GUBANO #TarımBilgisi #OrganikGübre #Çiftçi"
      : "Ziraat uzmanlarımızla görüşmek için DM gönderin.\n#GUBANO #ZiraatMühendisliği #ToprakSağlığı #OrganikTarım";
  } else {
    openingLine = `${emoji} ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} için GUBANO GÜBRE yanınızda!`;
    bodyLine = `Yılların deneyimi ve bilimsel AR-GE altyapısıyla geliştirilen GUBANO ürünleri, ${keyword} sürecinizi her aşamada destekler.\n\nHumik asit, leonardite ve biyostimülant içerikli özel formülasyonlarımız toprağınızı canlandırır, bitkilerinizi güçlendirir, veriminizi artırır. 🌾`;
    ctaLine = platform === "instagram"
      ? "Ürün bilgisi için DM at veya profilinizki linke tıkla 👇\n\n#GUBANO #organikgübre #tarım #verim #çiftçi #toprak #hasat #bitki #doğal #biyogübre #humicastid #leonardite #agri #mahsul #türkiye"
      : platform === "facebook"
      ? "Bizimle iletişime geçin, size özel çözüm üretelim! 📞\n#GUBANO #Tarım #OrganikGübre #Çiftçi #Verim"
      : "Şirketinize özel gübre çözümleri için mesaj atın.\n#GUBANO #SürdürülebilirTarım #OrganikTarım #AgriTech #Türkiye";
  }

  return `${openingLine}\n\n${bodyLine}\n\n${ctaLine}`;
}

// ─────────────────────────────────────────────────────────────
// AI ile içerik üret — Gemini 2.5 Flash öncelikli, Claude yedek
// ─────────────────────────────────────────────────────────────
async function generateContent(
  instruction: string, platform: string, tone: string,
  anthropicKey: string, geminiKey: string,
  referenceImageBase64?: string, referenceImageMimeType?: string
): Promise<{ text: string; source: "gemini" | "claude" | "template" }> {
  const prompt = buildPrompt(instruction, platform, tone);
  const hasImage = !!(referenceImageBase64 && referenceImageMimeType);

  // Görsel varsa prompt'a ekstra bağlam ekle
  const promptWithImageCtx = hasImage
    ? `${prompt}\n\n=== REFERANS GÖRSEL ===\nKullanıcı bir ürün/marka görseli yükledi. Görseli analiz et: renk, içerik, ürün detayları, etiket, atmosfer. İçeriği bu görseldeki bilgilere ve görsel tonuna uygun yaz.`
    : prompt;

  // 1. Gemini 2.5 Flash — multimodal (görsel + metin) veya sadece metin
  if (geminiKey) {
    try {
      // Görsel varsa multimodal parts oluştur
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parts: any[] = [];
      if (hasImage) {
        parts.push({ inlineData: { mimeType: referenceImageMimeType, data: referenceImageBase64 } });
      }
      parts.push({ text: promptWithImageCtx });

      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 1000,
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        },
        25000
      );
      if (res.ok) {
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text && text.length > 50) return { text, source: "gemini" };
      }
    } catch { /* timeout → devam */ }
  }

  // 2. Claude 3.5 Haiku — 25 sn timeout (görsel destekli fallback)
  if (anthropicKey && anthropicKey.startsWith("sk-ant")) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userContent: any[] = [];
      if (hasImage) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: referenceImageMimeType, data: referenceImageBase64 },
        });
      }
      userContent.push({ type: "text", text: promptWithImageCtx });

      const res = await fetchWithTimeout(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 1000,
            messages: [{ role: "user", content: userContent }],
          }),
        },
        25000
      );
      if (res.ok) {
        const d = await res.json();
        const text = d.content?.[0]?.text?.trim();
        if (text && text.length > 50) return { text, source: "claude" };
      }
    } catch { /* timeout → devam */ }
  }

  // 3. Akıllı şablon — her zaman çalışır
  return { text: templateFallback(instruction, platform, tone), source: "template" };
}

// ─────────────────────────────────────────────────────────────
// Türkçe tarım kelimesini İngilizce arama terimine çevir
// ─────────────────────────────────────────────────────────────
function toEnglishAgriKeyword(keyword: string): string {
  const map: Record<string, string> = {
    "buğday tarlaları":  "wheat field agriculture golden",
    "mısır üretimi":     "corn maize field agriculture",
    "sebze bahçeleri":   "vegetable farm garden agriculture",
    "ayçiçeği tarlaları":"sunflower field agriculture",
    "pamuk üretimi":     "cotton field agriculture",
    "bağ ve bahçe":      "vineyard orchard agriculture",
    "zeytin bahçeleri":  "olive grove agriculture",
    "kök sebze tarımı":  "root vegetable farming soil",
    "meyve bahçeleri":   "fruit orchard farming",
    "toprak sağlığı":    "soil earth farming agriculture",
    "organik tarım":     "organic farming green agriculture",
    "hasat sezonu":      "harvest agriculture golden field",
    "ekim sezonu":       "planting seeds farm agriculture",
    "özel kampanya":     "fertilizer soil agriculture field",
    "gübre çözümleri":   "fertilizer soil crop agriculture",
    "tarımsal üretim":   "agriculture farming field Turkey",
  };
  return map[keyword] ?? "agriculture farming field fertilizer";
}

// ─────────────────────────────────────────────────────────────
// Görsele GUBANO marka bandı ekle (Sharp SVG composite)
// ─────────────────────────────────────────────────────────────
async function addGubanoBrand(imgBuf: Buffer, w: number, h: number): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    const bh = Math.round(h * 0.13); // bant yüksekliği ≈ %13
    const fs = Math.round(bh * 0.30); // büyük font
    const ss = Math.round(bh * 0.18); // küçük font
    const svgBand = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${bh}">
        <defs>
          <linearGradient id="gr" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#14532d"/>
            <stop offset="100%" stop-color="#166534"/>
          </linearGradient>
        </defs>
        <rect width="${w}" height="${bh}" fill="url(#gr)" opacity="0.93"/>
        <text x="${Math.round(bh*0.8)}" y="${Math.round(bh*0.52)}"
          font-family="Arial,Helvetica,sans-serif" font-size="${fs}"
          font-weight="bold" fill="white">GUBANO GÜBRE</text>
        <text x="${Math.round(bh*0.8)}" y="${Math.round(bh*0.82)}"
          font-family="Arial,Helvetica,sans-serif" font-size="${ss}"
          fill="#86efac">
          Toprağınızı Geleceğe Hazırlayın • www.gubano.com.tr</text>
        <rect x="${w - Math.round(bh*2.2)}" y="${Math.round(bh*0.12)}"
          width="${Math.round(bh*2.0)}" height="${Math.round(bh*0.76)}"
          rx="6" fill="white" opacity="0.12"/>
        <text x="${w - Math.round(bh*1.2)}" y="${Math.round(bh*0.50)}"
          font-family="Arial,Helvetica,sans-serif" font-size="${ss}"
          fill="white" text-anchor="middle" font-weight="bold">🌱 ORGANİK GÜBRE</text>
        <text x="${w - Math.round(bh*1.2)}" y="${Math.round(bh*0.78)}"
          font-family="Arial,Helvetica,sans-serif" font-size="${Math.round(ss*0.8)}"
          fill="#bbf7d0" text-anchor="middle">HUMİK ASİT • LEONARDİT</text>
      </svg>`
    );
    return await sharp(imgBuf)
      .resize(w, h, { fit: "cover", position: "center" })
      .composite([{ input: svgBand, gravity: "south", blend: "over" }])
      .jpeg({ quality: 88 })
      .toBuffer();
  } catch {
    return imgBuf; // Sharp başarısız → orijinal görsel
  }
}

// ─────────────────────────────────────────────────────────────
// Görsel üret → GUBANO bandı ekle → Supabase'e yükle
// ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateAndUploadImage(
  instruction: string, platform: string, _hfToken: string,
  supabase: any
): Promise<{ url: string; mediaType: string; model: string } | null> {
  const keyword = extractKeyword(instruction);
  const w = platform === "instagram" ? 1080 : 1200;
  const h = platform === "instagram" ? 1080 : 630;

  // Supabase bucket hazır mı?
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some((b: { name: string }) => b.name === "social-media")) {
    await supabase.storage.createBucket("social-media", { public: true, fileSizeLimit: 52428800 });
  }

  const uploadBranded = async (buf: Buffer, model: string) => {
    try {
      const branded = await addGubanoBrand(buf, w, h);
      const path = `posts/gubano-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("social-media").upload(
        path, branded, { contentType: "image/jpeg" }
      );
      if (!error) {
        const { data } = supabase.storage.from("social-media").getPublicUrl(path);
        return { url: data.publicUrl, mediaType: "image/jpeg", model };
      }
    } catch { /* upload başarısız */ }
    return null;
  };

  // ── 1. HuggingFace FLUX.1-schnell (AI görsel) + GUBANO bandı ──
  if (_hfToken) {
    const enKeyword = toEnglishAgriKeyword(keyword);
    const imagePrompt = `Professional agricultural marketing photo, ${enKeyword}, lush healthy crops, golden hour sunlight, fertile farmland, vibrant green plants, photorealistic DSLR quality, no text no watermarks`;
    try {
      const res = await fetchWithTimeout(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
          method: "POST",
          headers: { "Authorization": `Bearer ${_hfToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ inputs: imagePrompt }),
        },
        45000
      );
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.startsWith("image/")) {
          const buf = Buffer.from(await res.arrayBuffer());
          if (buf.length > 10000) {
            const r = await uploadBranded(buf, "FLUX.1-schnell AI + GUBANO Marka");
            if (r) return r;
          }
        }
      }
    } catch { /* timeout → devam */ }
  }

  // ── 2. Küratörlü Unsplash tarım fotoğrafları (elle doğrulanmış ID'ler) ──
  const AGRI_UNSPLASH: Record<string, string[]> = {
    "buğday tarlaları":   ["1500595046743-cd271d694d30","1625246333195-78d9c38ad449","1502082553048-f009c37129b9"],
    "mısır üretimi":      ["1558618666-fcd25c85cd64","1500076656116-558758c991c1","1625246333195-78d9c38ad449"],
    "sebze bahçeleri":    ["1471193945509-9ad0617afabf","1592921870789-04563d55041c","1558618666-fcd25c85cd64"],
    "ayçiçeği tarlaları": ["1524492412937-b28074a5d7da","1500595046743-cd271d694d30","1625246333195-78d9c38ad449"],
    "pamuk üretimi":      ["1558618666-fcd25c85cd64","1500595046743-cd271d694d30","1625246333195-78d9c38ad449"],
    "bağ ve bahçe":       ["1481437156560-3205f6a55735","1467003909585-2f8a72700288","1506744038136-46273834b3fb"],
    "zeytin bahçeleri":   ["1506744038136-46273834b3fb","1481437156560-3205f6a55735","1467003909585-2f8a72700288"],
    "kök sebze tarımı":   ["1416879595882-3373a0480b5b","1471193945509-9ad0617afabf","1592921870789-04563d55041c"],
    "meyve bahçeleri":    ["1481437156560-3205f6a55735","1467003909585-2f8a72700288","1506744038136-46273834b3fb"],
    "toprak sağlığı":     ["1416879595882-3373a0480b5b","1585771724684-38269d6639fd","1589308078059-be1415eab4c3"],
    "organik tarım":      ["1585771724684-38269d6639fd","1589308078059-be1415eab4c3","1558618666-fcd25c85cd64"],
    "hasat sezonu":       ["1500595046743-cd271d694d30","1502082553048-f009c37129b9","1504701954957-2010ec3bcec1"],
    "ekim sezonu":        ["1416879595882-3373a0480b5b","1558618666-fcd25c85cd64","1625246333195-78d9c38ad449"],
    "özel kampanya":      ["1585771724684-38269d6639fd","1416879595882-3373a0480b5b","1589308078059-be1415eab4c3"],
    "gübre çözümleri":    ["1585771724684-38269d6639fd","1416879595882-3373a0480b5b","1589308078059-be1415eab4c3"],
    "tarımsal üretim":    ["1558618666-fcd25c85cd64","1500595046743-cd271d694d30","1625246333195-78d9c38ad449","1504701954957-2010ec3bcec1"],
    "default":            ["1558618666-fcd25c85cd64","1500595046743-cd271d694d30","1625246333195-78d9c38ad449","1504701954957-2010ec3bcec1","1416879595882-3373a0480b5b"],
  };
  {
    const ids = AGRI_UNSPLASH[keyword] ?? AGRI_UNSPLASH["default"];
    let hash = 0;
    for (let i = 0; i < instruction.length; i++) hash = (hash * 31 + instruction.charCodeAt(i)) >>> 0;
    const photoId = ids[hash % ids.length];
    try {
      const unsplashRes = await fetchWithTimeout(
        `https://images.unsplash.com/photo-${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=80`,
        { method: "GET", redirect: "follow" },
        15000
      );
      if (unsplashRes.ok && unsplashRes.headers.get("content-type")?.startsWith("image/")) {
        const buf = Buffer.from(await unsplashRes.arrayBuffer());
        if (buf.length > 5000) {
          const r = await uploadBranded(buf, "Tarım Görseli + GUBANO Marka");
          if (r) return r;
        }
      }
    } catch { /* timeout → Picsum dene */ }
  }

  // ── 3. İkinci Unsplash denemesi — farklı fotoğraf ──
  {
    const ids = AGRI_UNSPLASH[keyword] ?? AGRI_UNSPLASH["default"];
    let hash2 = 7;
    for (let i = 0; i < instruction.length; i++) hash2 = (hash2 * 37 + instruction.charCodeAt(i)) >>> 0;
    const photoId2 = ids[(hash2 + 1) % ids.length];
    try {
      const unsplashRes2 = await fetchWithTimeout(
        `https://images.unsplash.com/photo-${photoId2}?w=${w}&h=${h}&fit=crop&auto=format&q=80`,
        { method: "GET", redirect: "follow" },
        15000
      );
      if (unsplashRes2.ok && unsplashRes2.headers.get("content-type")?.startsWith("image/")) {
        const buf2 = Buffer.from(await unsplashRes2.arrayBuffer());
        if (buf2.length > 5000) {
          const r = await uploadBranded(buf2, "Tarım Görseli + GUBANO Marka");
          if (r) return r;
        }
      }
    } catch { /* timeout → Picsum */ }
  }

  // ── 4. Son çare: Sabit tarım Picsum ID'leri + GUBANO bandı ──
  // Bu ID'ler elle seçilmiş tarım/doğa fotoğraflarıdır
  const AGRI_PICSUM: Record<string, number[]> = {
    "buğday tarlaları":   [431, 432, 116, 163, 292],
    "mısır üretimi":      [293, 294, 117, 164, 430],
    "sebze bahçeleri":    [429, 295, 118, 165, 431],
    "ayçiçeği tarlaları": [178, 179, 296, 119, 432],
    "organik tarım":      [180, 297, 120, 166, 433],
    "toprak sağlığı":     [181, 298, 121, 167, 434],
    "hasat sezonu":       [182, 299, 122, 168, 435],
    "gübre çözümleri":    [183, 300, 123, 169, 436],
    default:              [184, 301, 124, 170, 437],
  };
  try {
    const ids = AGRI_PICSUM[keyword] ?? AGRI_PICSUM["default"];
    let hash = 0;
    for (let i = 0; i < instruction.length; i++) hash = (hash * 31 + instruction.charCodeAt(i)) >>> 0;
    const picId = ids[hash % ids.length];
    const picsumRes = await fetchWithTimeout(
      `https://picsum.photos/id/${picId}/${w}/${h}`,
      { method: "GET", redirect: "follow" },
      12000
    );
    if (picsumRes.ok && picsumRes.headers.get("content-type")?.startsWith("image/")) {
      const buf = Buffer.from(await picsumRes.arrayBuffer());
      const r = await uploadBranded(buf, "Doğa Görseli + GUBANO Marka");
      if (r) return r;
      // Upload başarısız → direkt Picsum URL (markalamadan)
      return { url: `https://picsum.photos/id/${picId}/${w}/${h}`, mediaType: "image/jpeg", model: "Stok Görsel" };
    }
  } catch { /* başarısız */ }

  return null;
}

// ─────────────────────────────────────────────────────────────
// Tarih dizisi üret
// ─────────────────────────────────────────────────────────────
function buildAllDates(plan: ReturnType<typeof parseTimeFromInstruction>): string[] {
  const p = (n: number) => String(n).padStart(2, "0");
  const now = new Date();
  const base = new Date(plan.scheduledAt);

  if (plan.scheduleMode === "weekly" && plan.weekdays?.length) {
    const dates: string[] = [];
    for (let w = 0; w < (plan.weekCount || 4); w++) {
      for (const wd of plan.weekdays) {
        const d = new Date(now);
        d.setDate(d.getDate() + ((wd - d.getDay() + 7) % 7) + w * 7);
        d.setHours(base.getHours(), base.getMinutes(), 0, 0);
        if (d > now) dates.push(`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`);
      }
    }
    return [...new Set(dates)].sort().slice(0, 20);
  }

  if (plan.scheduleMode === "monthly" && plan.monthDay) {
    return Array.from({ length: plan.monthCount || 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, plan.monthDay, base.getHours(), base.getMinutes(), 0);
      return d > now && d.getDate() === plan.monthDay
        ? `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
        : null;
    }).filter(Boolean) as string[];
  }

  return [plan.scheduledAt];
}

// ─────────────────────────────────────────────────────────────
// Ana endpoint
// ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { instruction, platform = "instagram", tone = "profesyonel", referenceImageBase64, referenceImageMimeType } = await req.json();
  if (!instruction?.trim()) return NextResponse.json({ error: "Talimat boş olamaz." }, { status: 400 });

  const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
  const HF_TOKEN = process.env.HF_API_TOKEN || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Talimatı analiz et (yerel — API gerektirmez)
  const timePlan = parseTimeFromInstruction(instruction);
  const needsImage = needsImageCheck(instruction, platform);
  const allDates = buildAllDates(timePlan);

  // 2. İçerik + görsel paralel üret
  const [contentResult, imageResult] = await Promise.all([
    generateContent(instruction, platform, tone, ANTHROPIC_KEY, GEMINI_KEY, referenceImageBase64, referenceImageMimeType),
    needsImage ? generateAndUploadImage(instruction, platform, HF_TOKEN, supabase) : Promise.resolve(null),
  ]);

  return NextResponse.json({
    ok: true,
    content: contentResult.text,
    contentSource: contentResult.source,   // "gemini" | "claude" | "template"
    mediaUrl: imageResult?.url || null,
    mediaType: imageResult?.mediaType || null,
    imageModel: imageResult?.model || null,
    needsImage,
    scheduledAt: timePlan.scheduledAt,
    scheduleMode: timePlan.scheduleMode,
    allDates,
    scheduleLabel: timePlan.scheduleLabel,
  });
}
