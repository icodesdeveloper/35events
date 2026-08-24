import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // No practical limit on admin uploads (cover photos, event media) —
      // a truly unlimited body isn't a real option (memory risk), so this
      // is set generously high instead. Participant vehicle photos are
      // compressed server-side to well under this regardless (see
      // lib/storage/compressImage.ts).
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
