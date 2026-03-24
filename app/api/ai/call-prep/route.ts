import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { customerId, stepTemplate, stepNo, seqName, customerName } = await req.json();

  const supabase = await createClient();

  // Müşterinin geçmiş temas kayıtlarını çek
  const { data: logsRaw } = await supabase
    .from("contact_logs")
    .select("contact_type, subject, notes, outcome, contacted_at")
    .eq("customer_id", customerId)
    .order("contacted_at", { ascending: false })
    .limit(10);

  const logs = (logsRaw ?? []) as Array<{
    contact_type: string; subject: string; notes: string | null;
    outcome: string | null; contacted_at: string;
  }>;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const apiKey = (!anthropicKey || anthropicKey.startsWith("your_") || anthropicKey.startsWith("sk-ant-api03-iH3V")) ? null : anthropicKey;
  const useGemini = !apiKey && geminiKey && !geminiKey.startsWith("your_");

  // ── Geçmiş temas özeti ──
  const logSummary = logs.length === 0
    ? "Daha önce kayıtlı bir temas bulunmuyor."
    : logs.map((l, i) =>
        `${i + 1}. [${new Date(l.contacted_at).toLocaleDateString("tr-TR")}] ${l.contact_type.toUpperCase()} — ${l.subject}. Sonuç: ${l.outcome ?? "—"}. Not: ${l.notes ?? "—"}`
      ).join("\n");

  // ── Hiçbir AI yoksa mock ──
  if (!apiKey && !useGemini) {
    const hasHistory = logs.length > 0;
    const lastOutcome = logs[0]?.outcome ?? null;

    const mockScript = generateMockCallScript({
      customerName, stepTemplate, stepNo, seqName, hasHistory, lastOutcome, logSummary
    });

    return NextResponse.json(mockScript);
  }

  const prompt = `Sen bir tarım sektörü satış danışmanısın. Bioverim Gübre ve Tarım Ürünleri A.Ş. adına müşteriyi arayacaksın.

MÜŞTERİ: ${customerName}
SEKANS ADI: ${seqName}
MEVCUT ADIM: Adım ${stepNo} — ${stepTemplate}

GEÇMIŞ TEMAS KAYITLARI:
${logSummary}

Arama için şunları üret (JSON formatında):
{
  "greeting": "Açılış cümlesi (doğal, kişiselleştirilmiş)",
  "mainPoints": ["Ana konu 1", "Ana konu 2", "Ana konu 3"],
  "keyQuestion": "Müşteriye sorulacak en kritik soru",
  "objections": [
    {"objection": "Muhtemel itiraz", "response": "Cevap önerisi"}
  ],
  "closing": "Kapanış ve sonraki adım",
  "tone": "agresif | nötr | sıcak | takip",
  "estimatedDuration": "5-10 dakika"
}

Sadece JSON döndür, başka açıklama ekleme.`;

  try {
    let text = "";

    if (useGemini) {
      // ── Google Gemini (Ücretsiz) ──
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 2048, temperature: 0.7, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
          }),
        }
      );
      if (!res.ok) throw new Error("Gemini API hatası: " + res.status);
      const data = await res.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    } else if (apiKey) {
      // ── Anthropic Claude ──
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-3-5-haiku-20241022", max_tokens: 1024, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error("Claude API hatası: " + res.status);
      const data = await res.json();
      text = data.content?.[0]?.text ?? "{}";
    }

    // Strip markdown code fences if present
    const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    let script: Record<string, unknown> = {};
    if (jsonMatch) {
      try { script = JSON.parse(jsonMatch[0]); } catch { script = {}; }
    }
    // If script is empty, fallback to mock
    if (!script.greeting) {
      const mock = generateMockCallScript({ customerName, stepTemplate, stepNo, seqName, hasHistory: logs.length > 0, lastOutcome: logs[0]?.outcome ?? null, logSummary });
      return NextResponse.json({ ...mock, source: useGemini ? "gemini" : "claude", logCount: logs.length });
    }
    return NextResponse.json({ ...script, source: useGemini ? "gemini" : "claude", logCount: logs.length });

  } catch (e) {
    console.error("AI call-prep error:", e);
    const mockScript = generateMockCallScript({
      customerName, stepTemplate, stepNo, seqName,
      hasHistory: logs.length > 0, lastOutcome: logs[0]?.outcome ?? null, logSummary
    });
    return NextResponse.json({ ...mockScript, source: "mock_fallback" });
  }
}

function generateMockCallScript(p: {
  customerName: string; stepTemplate: string; stepNo: number; seqName: string;
  hasHistory: boolean; lastOutcome: string | null; logSummary: string;
}) {
  const isFirstContact = !p.hasHistory;
  const isInterested = p.lastOutcome === "interested" || p.lastOutcome === "sale_made";
  const needsFollowUp = p.lastOutcome === "follow_up";

  return {
    source: "mock",
    logCount: p.hasHistory ? 1 : 0,
    greeting: isFirstContact
      ? `Merhaba, ${p.customerName} firmasını arıyorum. Ben Bioverim Gübre'den arıyorum, müsait misiniz?`
      : isInterested
        ? `Merhaba, geçen görüşmemizin ardından sizi aramak istedim. Bioverim'den arıyorum.`
        : `Merhaba, daha önce iletişime geçmiştik, kısaca ${p.stepTemplate.toLowerCase()} için arıyorum.`,

    mainPoints: [
      isFirstContact ? "Bioverim ürün gamını ve sektördeki avantajları tanıt" : "Önceki görüşme özeti ve güncel durum",
      p.stepTemplate,
      needsFollowUp ? "Önceki sorularına cevap ver ve bir sonraki adımı belirle" : "Yeni sezon kampanyalarını sun",
    ],

    keyQuestion: isFirstContact
      ? "Bu sezon gübre ihtiyacınızı nasıl karşılıyorsunuz, mevcut tedarikçinizden memnun musunuz?"
      : isInterested
        ? "Geçen konuştuğumuz teklifle ilgili düşünceleriniz neler, nasıl ilerleyelim?"
        : "Sizi en çok zorlayan tarım girdisi sorunu nedir?",

    objections: [
      { objection: "Fiyatlarınız pahalı", response: "Birlikte kg başına maliyet hesabı yapalım, verim farkı genelde fiyat farkını 3-4 katta kapatıyor." },
      { objection: "Şu an bütçem yok", response: "Anlıyorum, sezon başı ödeme planı seçeneğimiz var, şimdi sipariş verip Nisan'da öde." },
      { objection: "Mevcut markamdan memnunum", response: "Harika, numune göndersek yan yana deneme imkanı olur mu? Farkı kendiniz görmek istersiniz." },
    ],

    closing: isInterested
      ? "Teklifi hazırlayıp yarın WhatsApp'tan ileteyim, onayınızı bekliyorum."
      : "Bilgi vermek için arıyordum, numune göndermemi ister misiniz? Adresinizi alabilir miyim?",

    tone: isInterested ? "sıcak" : isFirstContact ? "nötr" : "takip",
    estimatedDuration: "5-10 dakika",
    historyNote: p.hasHistory ? p.logSummary : null,
  };
}
