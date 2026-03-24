import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export interface HeatScoreResult {
  score: number;
  label: "Sıcak" | "Ilık" | "Soğuk";
  color: "red" | "orange" | "blue";
  reasoning: string;
  cachedAt: string;
  source: "gemini" | "mock";
}

export async function POST(req: NextRequest) {
  const { customerId, customerName, forceRefresh } = await req.json();
  if (!customerId) {
    return NextResponse.json({ error: "customerId gerekli" }, { status: 400 });
  }

  const supabase = await createClient();

  // Önce customer.notes'taki cache'e bak (24 saat geçerliyse döndür)
  const { data: customerData } = await supabase
    .from("customers")
    .select("notes, segment")
    .eq("id", customerId)
    .single();

  const existingNotes = (customerData as { notes: string | null; segment: string } | null)?.notes ?? "";
  const segment = (customerData as { notes: string | null; segment: string } | null)?.segment ?? "lead";
  const cacheMatch = existingNotes.match(/\[HEAT_SCORE:([\s\S]*?)\]/);

  if (!forceRefresh && cacheMatch) {
    try {
      const cached = JSON.parse(cacheMatch[1]) as HeatScoreResult;
      const age = Date.now() - new Date(cached.cachedAt).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return NextResponse.json(cached); // 24 saat içindeyse cache'den döndür
      }
    } catch { /* cache bozuk, yeniden hesapla */ }
  }

  // Son 10 temas geçmişini çek
  const { data: logs } = await supabase
    .from("contact_logs")
    .select("contact_type, notes, outcome, contacted_at, direction")
    .eq("customer_id", customerId)
    .order("contacted_at", { ascending: false })
    .limit(10);

  const geminiKey = process.env.GEMINI_API_KEY;

  let result: HeatScoreResult;

  if (!geminiKey || geminiKey.startsWith("your_") || !logs?.length) {
    // Demo / AI yok — segment bazlı tahmin
    result = getSegmentBasedScore(segment, logs?.length ?? 0);
  } else {
    const segmentTurkish: Record<string, string> = {
      active: "Aktif müşteri",
      lead: "Aday müşteri",
      passive: "Pasif müşteri",
    };

    const historyText = (logs as Array<{ contact_type: string; notes: string | null; outcome: string | null; contacted_at: string; direction: string | null }>)
      .map((l, i) => {
        const date = new Date(l.contacted_at).toLocaleDateString("tr-TR");
        const dir = l.direction === "inbound" ? "↙ Gelen" : "↗ Giden";
        return `${i + 1}. [${date}] ${dir} ${l.contact_type} | Sonuç: ${l.outcome ?? "belirtilmemiş"} | Not: ${l.notes?.slice(0, 80) ?? "—"}`;
      })
      .join("\n");

    const prompt = `Sen bir müşteri davranış analisti olarak Bioverim Gübre müşterisinin satın alma potansiyelini değerlendiriyorsun.

MÜŞTERİ: ${customerName ?? "Bilinmiyor"}
SEGMENT: ${segmentTurkish[segment] ?? segment}
TOPLAM TEMAS SAYISI: ${logs.length}

SON TEMAS GEÇMİŞİ (en yeni önce):
${historyText}

Bu verilere göre müşterinin satın alma potansiyelini değerlendir:
{
  "score": 1-10 arası tam sayı,
  "label": "Sıcak" veya "Ilık" veya "Soğuk",
  "color": "red" veya "orange" veya "blue",
  "reasoning": "2-3 cümle gerekçe (Türkçe)"
}

KURALLAR:
- 8-10 → "Sıcak", color: "red" — aktif ilgi, satın alma yakın veya gerçekleşti
- 5-7 → "Ilık", color: "orange" — potansiyel var, düzenli takip gerekli
- 1-4 → "Soğuk", color: "blue" — düşük ilgi, uzun süre sessiz veya ret aldı

Sadece JSON döndür.`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 300,
              temperature: 0.3,
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          }),
        }
      );

      if (!res.ok) throw new Error("Gemini: " + res.status);
      const data = await res.json();
      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("JSON parse failed");

      const parsed = JSON.parse(match[0]);
      result = {
        score: parsed.score ?? 5,
        label: parsed.label ?? "Ilık",
        color: parsed.color ?? "orange",
        reasoning: parsed.reasoning ?? "",
        cachedAt: new Date().toISOString(),
        source: "gemini",
      };
    } catch (e) {
      console.error("Heat score hatası:", e);
      result = getSegmentBasedScore(segment, logs.length);
    }
  }

  // Cache'i customer.notes'a yaz (mevcut notları koru)
  try {
    const cacheStr = JSON.stringify(result);
    const cleanedNotes = existingNotes.replace(/\[HEAT_SCORE:[\s\S]*?\]/, "").trim();
    const updatedNotes = cleanedNotes + `\n[HEAT_SCORE:${cacheStr}]`;
    await supabase
      .from("customers")
      .update({ notes: updatedNotes.trim() })
      .eq("id", customerId);
  } catch { /* cache yazma hatası kritik değil */ }

  return NextResponse.json(result);
}

function getSegmentBasedScore(segment: string, logCount: number): HeatScoreResult {
  let score = 5;
  let label: HeatScoreResult["label"] = "Ilık";
  let color: HeatScoreResult["color"] = "orange";

  if (segment === "active" && logCount >= 3) { score = 7; label = "Ilık"; color = "orange"; }
  else if (segment === "active") { score = 6; label = "Ilık"; color = "orange"; }
  else if (segment === "lead" && logCount >= 2) { score = 5; label = "Ilık"; color = "orange"; }
  else if (segment === "lead") { score = 4; label = "Soğuk"; color = "blue"; }
  else if (segment === "passive") { score = 2; label = "Soğuk"; color = "blue"; }

  return {
    score,
    label,
    color,
    reasoning: logCount === 0
      ? "Henüz temas kaydı yok. Segment bilgisine göre tahmini skor."
      : `${logCount} temas kaydı bulundu. Segment: ${segment === "active" ? "Aktif" : segment === "lead" ? "Aday" : "Pasif"}.`,
    cachedAt: new Date().toISOString(),
    source: "mock",
  };
}
