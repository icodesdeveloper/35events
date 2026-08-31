import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static resolves its bundled binary from a __dirname-relative path
  // at module load. Bundling it rewrites that path, so the server ends up
  // spawning a binary that isn't there and every transcode fails. Keeping it
  // external leaves the real node_modules layout intact.
  serverExternalPackages: ["ffmpeg-static"],
  experimental: {
    serverActions: {
      // No practical limit on admin uploads (cover photos, event media) —
      // a truly unlimited body isn't a real option (memory risk), so this
      // is set generously high instead. Participant vehicle photos are
      // compressed server-side to well under this regardless (see
      // lib/storage/compressImage.ts).
      bodySizeLimit: "50mb",
    },
    // proxy.ts matches /admin/:path*, so every admin request (including
    // server-action form posts) passes through the proxy body buffer.
    // Its own limit defaults to 10MB regardless of serverActions.bodySizeLimit
    // above, silently truncating larger multipart uploads ("Unexpected end
    // of form"). Keep this in sync with bodySizeLimit.
    proxyClientMaxBodySize: "50mb",
  },
};

export default nextConfig;
