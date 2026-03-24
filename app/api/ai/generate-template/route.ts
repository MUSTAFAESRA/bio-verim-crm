import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const {
    mode = "new",
    channel,
    category,
    context,
    customerName,
    productName,
    existingTemplate,
    uploadedContent,
    uploadedMimeType,
  } = await req.json();

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const apiKey = (!anthropicKey || anthropicKey.startsWith("your_") || anthropicKey.startsWith("sk-ant-api03-iH3V")) ? null : anthropicKey;
  const useGemini = geminiKey && !geminiKey.startsWith("your_");

  const channelNames: Record<string, string> = {
    whatsapp: "WhatsApp mesajı",
    email: "e-posta",
    instagram: "Instagram DM",
    linkedin_dm: "LinkedIn DM",
    facebook_dm: "Facebook Mesaj",
    telegram: "Telegram mesajı",
    call: "telefon konuşma scripti",
  };

  const categoryNames: Record<string, string> = {
    urun_tanitim: "ürün tanıtımı",
    kampanya: "kampanya duyurusu",
    takip: "takip/follow-up",
    genel: "genel iletişim",
  };

  const channelLabel = channelNames[channel] ?? channel;
  const categoryLabel = categoryNames[category] ?? category;

  // ── Hiçbir AI yoksa mock ──
  if (!apiKey && !useGemini) {
    return NextResponse.json({
      content: generateMockTemplate(channel, category, customerName, productName, context),
      source: "mock"
    });
  }

  // ── Prompt oluştur ──
  let prompt = "";

  if (mode === "improve" && existingTemplate) {
    prompt = `Sen Bioverim Gübre ve Tarım Ürünleri A.Ş. için tarım sektörüne yönelik satış mesajları uzmanısın.

MEVCUT ŞABLON (geliştir, iyileştir):
---
${existingTemplate}
---

GELİŞTİRME TALEBİ: ${context || "Daha ikna edici, profesyonel ve etkili hale getir"}

${channel ? `KANAL: ${channelLabel}` : ""}
${category ? `KATEGORİ: ${categoryLabel}` : ""}
${customerName ? `MÜŞTERİ: ${customerName}` : ""}
${productName ? `ÜRÜN: ${productName}` : ""}
${uploadedContent && uploadedMimeType === "text/plain" ? `\nReferans belge içeriği:\n---\n${uploadedContent.slice(0, 3000)}\n---` : ""}

KURALLAR:
- Türkçe yaz
- Mevcut şablonun yapısını koru ama geliştir
- {{musteri_adi}}, {{urun_adi}}, {{fiyat}}, {{tarih}} değişken placeholder'larını kullan
- Kanal tonuna uygun ol (WhatsApp kısa ve samimi, e-posta daha resmi)
- Gübre/tarım sektörüne özel dil kullan
- Sadece şablon metnini döndür, başlık veya açıklama ekleme`;
  } else {
    prompt = `Sen Bioverim Gübre ve Tarım Ürünleri A.Ş. için tarım sektörüne yönelik satış mesajları yazıyorsun.

İSTEK:
- Kanal: ${channelLabel}
- Kategori: ${categoryLabel}
- Müşteri adı: ${customerName || "{{musteri_adi}}"}
- Ürün: ${productName || "Bio Verim ürünleri"}
- Ek bağlam: ${context || "Yok"}
${uploadedContent && uploadedMimeType === "text/plain" ? `\nReferans belge (analiz et ve şablona yansıt):\n---\n${uploadedContent.slice(0, 3000)}\n---` : ""}

KURALLAR:
- Türkçe yaz
- Kanal tonuna uygun ol (WhatsApp kısa ve samimi, e-posta daha resmi)
- Gübre/tarım sektörüne özel dil kullan
- {{musteri_adi}}, {{urun_adi}}, {{fiyat}}, {{tarih}} gibi değişken placeholder kullan
- ${channel === "call" ? "Script formatında: Açılış > Ana mesaj > Soru > Kapanış" : "Doğal, ikna edici bir mesaj yaz"}
- ${channel === "email" ? "Konu satırı ekle: [KONU]: ..." : ""}

Sadece mesaj içeriğini döndür, başlık veya açıklama ekleme.`;
  }

  try {
    let content = "";

    if (useGemini) {
      // ── Google Gemini (multimodal — PDF destekli) ──
      const parts: unknown[] = [{ text: prompt }];

      // PDF dosyası varsa Gemini inline_data olarak ekle
      if (uploadedContent && uploadedMimeType === "application/pdf") {
        parts.push({
          inline_data: {
            mime_type: "application/pdf",
            data: uploadedContent,
          }
        });
        // PDF için prompt ekle
        parts[0] = { text: prompt + "\n\nEklenen PDF dosyasını analiz ederek şablonu oluştur/geliştir." };
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              maxOutputTokens: 1500,
              temperature: 0.8,
              thinkingConfig: { thinkingBudget: 0 }
            },
          }),
        }
      );
      if (!res.ok) throw new Error("Gemini API: " + res.status);
      const data = await res.json();
      content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else if (apiKey) {
      // ── Anthropic Claude (fallback) ──
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-3-5-haiku-20241022", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error("Claude API: " + res.status);
      const data = await res.json();
      content = data.content?.[0]?.text ?? "";
    }

    return NextResponse.json({ content, source: useGemini ? "gemini" : "claude" });
  } catch (e) {
    console.error("AI template error:", e);
    return NextResponse.json({
      content: generateMockTemplate(channel, category, customerName, productName, context),
      source: "mock_fallback"
    });
  }
}

function generateMockTemplate(
  channel: string, category: string,
  customerName?: string, productName?: string, context?: string
): string {
  const name = customerName || "{{musteri_adi}}";
  const product = productName || "Bio Verim Sıvı Gübre";
  void context;

  const templates: Record<string, Record<string, string>> = {
    whatsapp: {
      urun_tanitim: `Merhaba ${name} 👋\n\nBioverim'den yazıyorum. ${product} ile bu sezon veriminizi artırmak ister misiniz?\n\n✅ Organik sertifikalı\n✅ Hızlı etki, uzun koruma\n✅ Ücretsiz numune imkanı\n\nDetay almak ister misiniz? 🌱`,
      kampanya: `Merhaba ${name} 🌾\n\nMüjde! Bu hafta ${product} alımlarında %15 erken rezervasyon indirimi başladı.\n\n⏰ Son tarih: {{tarih}}\n💰 Fiyat: {{fiyat}} TL/litre\n\nSipariş için mesaj atın, aramayı ben yapayım! 📞`,
      takip: `Merhaba ${name},\n\nGeçen görüşmemizin ardından size ulaşmak istedim. ${product} hakkında aklınızda kalan sorular var mıydı?\n\nYardımcı olmaktan mutluluk duyarım 😊`,
      genel: `Merhaba ${name} 👋\n\nBioverim Gübre olarak sezon boyunca yanınızdayız. Herhangi bir konuda destek almak isterseniz buradayım.\n\nİyi tarımlar! 🌱`,
    },
    email: {
      urun_tanitim: `[KONU]: ${product} — Veriminizi Bu Sezon Artırın\n\nSayın ${name},\n\nBioverim Gübre ve Tarım Ürünleri olarak sizinle değerli bir bilgiyi paylaşmak istiyoruz.\n\n${product}, organik bileşimi ve hızlı absorpsiyon özelliğiyle sahaya uygulandıktan sonra 72 saat içinde etkisini gösterir.\n\nSize özel numune göndermemizi ister misiniz?\n\nSaygılarımızla,\nBioverim Satış Ekibi`,
      kampanya: `[KONU]: {{tarih}} Tarihine Kadar Geçerli Özel Fiyat\n\nSayın ${name},\n\nSezon başı kampanyamız kapsamında ${product} için özel fiyatlandırma sunuyoruz.\n\nKampanya Detayları:\n• Ürün: ${product}\n• Fiyat: {{fiyat}} TL\n• Geçerlilik: {{tarih}}\n\nDetaylı bilgi için bizi arayabilirsiniz.\n\nSaygılarımızla,\nBioverim Gübre`,
      takip: `[KONU]: Görüşmemizin Takibi — Bioverim\n\nSayın ${name},\n\nÖnceki görüşmemizin ardından size ulaşmak istedim. Teklifimiz hakkında değerlendirmeleriniz nedir?\n\nBir sorunuz varsa yanıtlamak için hazırım.\n\nSaygılarımızla,\nBioverim Satış Ekibi`,
      genel: `[KONU]: Bioverim Gübre — Sezon Bilgilendirmesi\n\nSayın ${name},\n\nBu sezon ihtiyaçlarınızı karşılamak için hazırız. Ürün listemize ulaşmak için web sitemizi ziyaret edebilir ya da bizi arayabilirsiniz.\n\nSaygılarımızla,\nBioverim Gübre`,
    },
    call: {
      urun_tanitim: `AÇILIŞ: "Merhaba, ${name} firmasından biriyle görüşebilir miyim? Ben Bioverim'den {{yetkili_adi}} arıyorum."\n\nANA MESAJ: "Bu sezon ${product} hakkında sizi bilgilendirmek istedim. Organik sertifikalı ve hızlı etkili ürünümüzü kullanıcılarımız çok beğeniyor."\n\nSORU: "Şu an gübre tedariğinizi nasıl yapıyorsunuz, mevcut tedarikçinizden memnun musunuz?"\n\nKAPANIŞ: "Size numune göndersem deneye bilir misiniz? Adresinizi alabilir miyim?"`,
      takip: `AÇILIŞ: "Merhaba ${name}, geçen hafta görüşmüştük, nasılsınız?"\n\nANA MESAJ: "Teklifimizi değerlendirdiniz mi, aklınızda kalan sorular var mıydı?"\n\nSORU: "Karar vermek için başka ne lazım olur size?"\n\nKAPANIŞ: "Anlaşalım ve sizi bu sezon yakından takip edelim."`,
      genel: `AÇILIŞ: "Merhaba, Bioverim Gübre'den arıyorum."\n\nANA MESAJ: "Kısa bir bilgi vermek istedim."\n\nSORU: "Şu an uygun musunuz?"\n\nKAPANIŞ: "Teşekkürler, iyi günler dilerim."`,
    },
  };

  const channelTemplates = templates[channel] ?? templates.whatsapp;
  return channelTemplates[category] ?? channelTemplates.genel ?? `${name} için ${category} mesajı`;
}
