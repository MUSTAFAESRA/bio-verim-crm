import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { createMockClient } from "@/lib/supabase/mock-client";

function isDemo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return !url || url.includes("placeholder") || !url.startsWith("https://");
}

export function createClient() {
  if (isDemo()) {
    return createMockClient() as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
