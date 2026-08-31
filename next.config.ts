import type { NextConfig } from "next";

// `next build` sizes its worker pool from os.cpus(), which inside a container
// reports the *host's* cores, not the container's limit — so on Pterodactyl it
// happily spawned ~11 build workers against a small memory cap and the kernel
// OOM-killed the build ("Killed", leaving no .next for `next start`). Capping
// it keeps the build inside the container's budget; raise NEXT_BUILD_CPUS on a
// roomier machine to trade memory for build speed.
const buildCpus = Math.max(1, Number(process.env.NEXT_BUILD_CPUS) || 2);

const nextConfig: NextConfig = {
  // Source maps are generated during the prerender phase and are pure memory
  // overhead for a production build that never ships them.
  enablePrerenderSourceMaps: false,
  // ffmpeg-static resolves its bundled binary from a __dirname-relative path
  // at module load. Bundling it rewrites that path, so the server ends up
  // spawning a binary that isn't there and every transcode fails. Keeping it
  // external leaves the real node_modules layout intact.
  serverExternalPackages: ["ffmpeg-static"],
  experimental: {
    cpus: buildCpus,
    serverSourceMaps: false,
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
