import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The scanner saves every read - photo, rectified image, what it decided - by
  // POSTing to /_capture. That endpoint lives in scripts/scan-server.py, so a
  // card scanned from a phone against the dev server would otherwise drop its
  // capture on the floor and there would be nothing to look at afterwards.
  async rewrites() {
    return [{ source: "/_capture", destination: "http://127.0.0.1:8000/_capture" }];
  },

  // The scanner and the card are served as plain files out of public/, which
  // Safari is happy to hold on to across reloads. A phone quietly running an
  // older scanner than the one being debugged wastes an evening, so these two
  // are never cached.
  async headers() {
    return [{
      source: "/:file(scan-v2.html|card-v2.html|scan-test.html|card-v1.html|names.html|map.html)",
      headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
    }];
  },
};

export default nextConfig;
