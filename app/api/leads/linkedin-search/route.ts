import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 120;

interface LinkedInCompany {
  name?: string;
  description?: string;
  website?: string;
  headquarters?: string;
  companySize?: string;
  industry?: string;
  linkedInUrl?: string;
  followers?: number;
  employeeCount?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") || "gübre";
  const city = searchParams.get("city") || "Türkiye";
  const maxResults = Math.min(Number(searchParams.get("max") || "20"), 40);

  const apifyToken = process.env.APIFY_TOKEN;
  if (!apifyToken || apifyToken.startsWith("your_") || apifyToken === "") {
    return NextResponse.json({ error: "NO_TOKEN" }, { status: 401 });
  }

  const searchQuery = `${keyword} ${city}`;

  try {
    // LinkedIn Company Search — Apify actor: bebity/linkedin-companies-scraper
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/bebity~linkedin-companies-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [
            {
              url: `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(searchQuery)}&origin=GLOBAL_SEARCH_HEADER`,
            },
          ],
          maxResults,
          proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        }),
        signal: AbortSignal.timeout(100_000),
      }
    );

    if (!runRes.ok) {
      const errText = await runRes.text();
      console.error("LinkedIn Apify error:", errText);
      // Parse Apify error for better message
      let apifyMsg = runRes.statusText;
      try {
        const parsed = JSON.parse(errText);
        apifyMsg = parsed?.error?.message || parsed?.message || runRes.statusText;
      } catch {}
      return NextResponse.json({
        error: `LinkedIn aktörü hatası: ${apifyMsg}. Apify hesabınızda "bebity/linkedin-companies-scraper" aktörüne erişim ve LinkedIn session cookie gereklidir.`,
      }, { status: 502 });
    }

    const companies: LinkedInCompany[] = await runRes.json();

    // Check which LinkedIn URLs already exist in leads
    const supabase = await createClient();
    const linkedInUrls = companies.map((c) => c.linkedInUrl).filter(Boolean) as string[];
    const { data: existing } = await supabase
      .from("leads")
      .select("source_ref_id")
      .in("source_ref_id", linkedInUrls);

    const existingIds = new Set(existing?.map((e) => e.source_ref_id) ?? []);

    const results = companies
      .filter((c) => c.name)
      .map((c) => ({
        name: c.name ?? "",
        description: c.description || null,
        website: c.website || null,
        city: c.headquarters || city,
        industry: c.industry || null,
        company_size: c.companySize || null,
        followers: c.followers || c.employeeCount || null,
        linkedin_url: c.linkedInUrl || null,
        already_added: existingIds.has(c.linkedInUrl ?? ""),
      }));

    return NextResponse.json({ results, total: results.length });
  } catch (err) {
    console.error("LinkedIn search error:", err);
    return NextResponse.json({ error: "Apify bağlantı hatası." }, { status: 500 });
  }
}
