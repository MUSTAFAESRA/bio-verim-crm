import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

interface FacebookGroupMember {
  name?: string;
  profileUrl?: string;
  location?: string;
  about?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const groupUrl = searchParams.get("groupUrl");
  const keyword = searchParams.get("keyword") || "";
  const maxResults = Math.min(Number(searchParams.get("max") || "20"), 40);

  if (!groupUrl) {
    return NextResponse.json({ error: "Grup URL parametresi gerekli" }, { status: 400 });
  }

  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken || apifyToken.startsWith("your_") || apifyToken === "") {
    return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });
  }

  try {
    // Facebook Groups Scraper — Apify actor: apify/facebook-groups-scraper
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url: groupUrl }],
          maxPosts: 50,
          maxComments: 0,
          maxReviews: 0,
          proxy: { useApifyProxy: true },
        }),
        signal: AbortSignal.timeout(100_000),
      }
    );

    if (!runRes.ok) {
      const errText = await runRes.text();
      console.error("Facebook Apify error:", errText);
      let apifyMsg = runRes.statusText;
      try {
        const parsed = JSON.parse(errText);
        apifyMsg = parsed?.error?.message || parsed?.message || runRes.statusText;
      } catch {}
      return NextResponse.json({
        error: `Facebook aktörü hatası: ${apifyMsg}. Apify hesabınızda "apify/facebook-groups-scraper" aktörüne erişim gereklidir.`,
      }, { status: 502 });
    }

    const raw = await runRes.json();
    // Actor returns posts array — extract unique authors as members
    const postsArray = Array.isArray(raw) ? raw : [];
    const memberMap = new Map<string, FacebookGroupMember>();
    for (const post of postsArray) {
      const name = post.user?.name || post.authorName || post.from?.name;
      const profileUrl = post.user?.url || post.authorUrl || post.from?.link;
      if (name && !memberMap.has(name)) {
        memberMap.set(name, { name, profileUrl: profileUrl || null });
      }
    }
    const members: FacebookGroupMember[] = Array.from(memberMap.values()).slice(0, maxResults);

    const supabase = await createClient();
    const profileUrls = members.map((m) => m.profileUrl).filter(Boolean) as string[];
    const { data: existing } = await supabase
      .from("leads")
      .select("source_ref_id")
      .in("source_ref_id", profileUrls);

    const existingIds = new Set(existing?.map((e) => e.source_ref_id) ?? []);

    const results = members
      .filter((m) => m.name)
      .filter((m) => {
        if (!keyword) return true;
        const text = `${m.name} ${m.about || ""} ${m.location || ""}`.toLowerCase();
        return text.includes(keyword.toLowerCase());
      })
      .map((m) => ({
        name: m.name ?? "",
        profile_url: m.profileUrl || null,
        location: m.location || null,
        about: m.about || null,
        already_added: existingIds.has(m.profileUrl ?? ""),
      }));

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    console.error("Facebook search error:", err);
    return NextResponse.json({ error: "Apify bağlantı hatası." }, { status: 500 });
  }
}
