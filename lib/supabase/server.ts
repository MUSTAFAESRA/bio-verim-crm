import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { isDemoMode } from "@/lib/demo-data";
import { createMockClient, hydrateFromDisk } from "@/lib/supabase/mock-client";
import fs from "fs";
import path from "path";

// Inject Node.js fs/path into globalThis so mock-client (dual-bundled) can
// use them without importing directly (which breaks client bundle).
(globalThis as unknown as Record<string, unknown>).__serverFs = fs;
(globalThis as unknown as Record<string, unknown>).__serverPath = path;

// First request in this process: load persisted data from disk
hydrateFromDisk();

export async function createClient() {
  if (isDemoMode()) {
    return createMockClient() as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — ignored
          }
        },
      },
    }
  );
}

export async function createAdminClient() {
  if (isDemoMode()) {
    return createMockClient() as unknown as ReturnType<typeof createServerClient<Database>>;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // ignored
          }
        },
      },
    }
  );
}
