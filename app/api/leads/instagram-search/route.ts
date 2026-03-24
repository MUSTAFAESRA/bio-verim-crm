import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;

interface InstagramProfile {
  username?: string;
  fullName?: string;
  biography?: string;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  profilePicUrl?: string;
  url?: string;
  isVerified?: boolean;
  externalUrl?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hashtag = searchParams.get("hashtag") || "gübre";
  const minFollowers = Number(searchParams.get("minFollowers") || "1000");
  const maxResults = Math.min(Number(searchParams.get("max") || "20"), 40);

  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken || apifyToken.startsWith("your_") || apifyToken === "") {
    return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });
  }

  // Clean hashtag
  const cleanHashtag = hashtag.replace(/^#/, "");

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/explore/tags/${encodeURIComponent(cleanHashtag)}/`],
          resultsType: "posts",
          resultsLimit: maxResults * 3,
          scrapePostsUntilDate: null,
          proxy: { useApifyProxy: true },
        }),
        signal: AbortSignal.timeout(100_000),
      }
    );

    if (!runRes.ok) {
      const err = await runRes.text();
      console.error("Instagram Apify error:", err);
      return NextResponse.json({ error: "Apify arama hatası: " + runRes.statusText }, { status: 502 });
    }

    const posts: Array<{ ownerUsername?: string; ownerFullName?: string; ownerId?: string; url?: string }> = await runRes.json();

    // Deduplicate by username and build profile-like results
    const seen = new Set<string>();
    const results: Array<{
      username: string;
      full_name: string | null;
      post_url: string | null;
      profile_url: string | null;
      already_added: boolean;
    }> = [];

    for (const post of posts) {
      const username = post.ownerUsername;
      if (!username || seen.has(username)) continue;
      seen.add(username);

      results.push({
        username,
        full_name: post.ownerFullName || null,
        post_url: post.url || null,
        profile_url: `https://instagram.com/${username}`,
        already_added: false,
      });

      if (results.length >= maxResults) break;
    }

    return NextResponse.json({ results, total: results.length, hashtag: cleanHashtag });
  } catch (err) {
    console.error("Instagram search error:", err);
    return NextResponse.json({ error: "Apify bağlantı hatası." }, { status: 500 });
  }
}
