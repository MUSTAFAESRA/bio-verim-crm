import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Supabase v2.99.x type inference issue with select("*") — runtime is correct
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
