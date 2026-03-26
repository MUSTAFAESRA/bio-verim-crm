import { NextRequest, NextResponse } from "next/server";

const PLATFORM_PROMPTS: Record<string, string> = {
  linkedin: `LinkedIn için profesyonel, değer katan bir paylaşım yaz.
Hedef kitle: B2B, tarım sektörü profesyonelleri, şirket sahipleri.
Uzunluk: 150-300 kelime. Emoji az kullan. Hashtag: 3-5 adet.
Güçlü bir açılış cümlesi kullan. Taktiksel veya eğitici bilgi ekle.`,

  facebook: `Facebook sayfası için etkileşimi yüksek, samimi bir paylaşım yaz.
Hedef kitle: Çiftçiler, tarım meraklıları, gübre kullanıcıları.
Uzunluk: 100-200 kelime. Emoji kullan. Soru sor. Paylaşımı tetikle.
Hashtag: 5-8 adet.`,

  instagram: `Instagram için görsel odaklı, etkileyici bir caption yaz.
Hedef kitle: Tarım influencer'ları, çiftçiler, organik tarım meraklıları.
Uzunluk: 100-150 kelime. Çok emoji kullan.
Hashtag bloğu en sona koy: 15-20 adet ilgili hashtag.`,
};

const TONE_PROMPTS: Record<string, string> = {
  profesyonel: "Ton: Profesyonel, güvenilir, otoriter.",
  samimi: "Ton: Samimi, sıcak, insancıl, arkadaşça.",
  heyecanlı: "Ton: Heyecanlı, enerjik, motivasyonel, aksiyon çağrısı kuvvetli.",
  bilgilendirici: "Ton: Eğitici, bilgilendirici, verilerle desteklenmiş.",
  kampanya: "Ton: Aciliyet hissi yaratan, indirim/fırsat vurgulu, harekete geçirici.",
};

export async function POST(req: NextRequest) {
  const { topic, tone = "profesyonel", platform = "linkedin" } = await req.json();

  if (!topic?.trim()) return NextResponse.json({ error: "Konu boş olamaz." }, { status: 400 });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  const platformPrompt = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.linkedin;
  const tonePrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.profesyonel;

  const systemPrompt = `Sen GUBANO GÜBRE markası için sosyal medya içerik uzmanısın.
Türkçe yaz. Doğal ve akıcı ol. Marka: "GUBANO GÜBRE" - tarım sektöründe gübre ve zirai ilaç tedarikçisi.

${platformPrompt}
${tonePrompt}

Konu: ${topic}

Sadece paylaşım metnini yaz, açıklama veya not ekleme.`;

  // Önce Gemini dene (ücretsiz)
  if (GEMINI_KEY && GEMINI_KEY !== "your_gemini_api_key") {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              temperature: 0.8,
              maxOutputTokens: 800,
            },
          }),
        }
      );
      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return NextResponse.json({ content: content.trim(), model: "Gemini Flash" });
    } catch {}
  }

  // Anthropic Claude (yedek)
  if (ANTHROPIC_KEY && ANTHROPIC_KEY !== "your_anthropic_api_key") {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-20240307",
          max_tokens: 800,
          messages: [{ role: "user", content: systemPrompt }],
        }),
      });
      const data = await res.json();
      const content = data.content?.[0]?.text;
      if (content) return NextResponse.json({ content: content.trim(), model: "Claude Haiku" });
    } catch {}
  }

  // Hazır şablon (AI yoksa)
  const templates: Record<string, string> = {
    linkedin: `🌱 ${topic} - Tarım Sektöründe Fark Yaratan Çözümler\n\nGUBANO GÜBRE olarak, çiftçilerimizin başarısı için en kaliteli ürünleri sunuyoruz. ${topic} konusundaki uzmanlığımızla sektörde fark yaratıyoruz.\n\n✅ Kanıtlanmış formüller\n✅ Uzman tarım danışmanlığı\n✅ Güvenilir tedarik zinciri\n\nDaha fazla bilgi için bize ulaşın!\n\n#Tarım #GUBANO #Gübre #Verim #TarımTeknolojisi`,
    facebook: `🌾 ${topic} hakkında bilmeniz gerekenler!\n\nGUBANO GÜBRE ailesi olarak her zaman yanınızdayız. Sorularınızı yorumlarda paylaşın! 👇\n\n#Tarım #Gübre #Çiftçi #GUBANO`,
    instagram: `✨ ${topic} ✨\n\nGUBANO GÜBRE ile toprağınıza en iyisini verin! 🌱\n\n#tarım #gübre #organik #çiftçi #GUBANO #verim #toprak #bitkibesleme #tarımteknolojisi #doğal`,
  };

  const content = templates[platform] || templates.linkedin;
  return NextResponse.json({ content, model: "Şablon" });
}
