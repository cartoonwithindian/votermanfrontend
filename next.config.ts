import type { NextConfig } from "next";

// Next.js rejects Server Action POSTs with "Invalid Server Actions request."
// (error E80) when the browser's `Origin` header host does not match the
// `Host` header the server receives. Server actions may fire from any page,
// and when the app is reached through a LAN IP or a tunnel / reverse proxy,
// the Origin no longer matches Host, so those origins must be allowlisted.
//
// Pattern rules: each dot-separated segment can be `*` (one segment) or `**`
// (rest of the host). The port is part of the last segment, e.g. the origin
// `http://10.0.0.5:3001` has host `10.0.0.5:3001`.
const devAllowedOrigins = [
  "localhost:3000",
  "localhost:3001",
  "127.0.0.1:3000",
  "127.0.0.1:3001",
  // Reachable by machine IP on common private ranges (any port)
  "10.*.*.*",
  "192.168.*.*",
  "172.16.*.*",
  "172.17.*.*",
  "172.18.*.*",
  "172.19.*.*",
  "172.20.*.*",
  "172.21.*.*",
  "172.22.*.*",
  "172.23.*.*",
  "172.24.*.*",
  "172.25.*.*",
  "172.26.*.*",
  "172.27.*.*",
  "172.28.*.*",
  "172.29.*.*",
  "172.30.*.*",
  "172.31.*.*",
];

const extraOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Production hosts that must be accepted for Server Actions (E80 guard).
// Nothing is hardcoded — every host is read from env:
//   - NEXT_PUBLIC_APP_URL            canonical app URL (e.g. https://app.example.com)
//   - NEXT_PUBLIC_APP_URL_S1         optional secondary app URL
//   - NEXT_PUBLIC_CLERK_APP_DOMAIN   Clerk custom front-end API domain (e.g. clerk.example.com)
//   - SERVER_ACTIONS_ALLOWED_ORIGINS extra hosts, comma-separated (host or https://host)
// NEXT_PUBLIC_ALT_HOSTS is intentionally not added here (it is for the proxy's
// canonical redirect only).
const appHost = (process.env.NEXT_PUBLIC_APP_URL || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .toLowerCase();
const appS1Host = (process.env.NEXT_PUBLIC_APP_URL_S1 || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .toLowerCase();
const clerkAppHost = (process.env.NEXT_PUBLIC_CLERK_APP_DOMAIN || "")
  .replace(/^https?:\/\//, "")
  .toLowerCase();
const prodAllowedOrigins = Array.from(new Set([appHost, appS1Host, clerkAppHost].filter(Boolean)));

// Backend origin for the /api reverse proxy. The browser ONLY talks to the
// frontend origin (same-site cookies); Next.js proxies /api/* to this origin.
// Override per-deployment via BACKEND_API_ORIGIN.
const backendApiOrigin =
  process.env.BACKEND_API_ORIGIN || "http://localhost:3000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Proxy API traffic through this server so cookies (cv_sid, cv_csrf) are
  // first-party. In local development the frontend proxies to
  // http://localhost:3000; without this, cookies may be blocked when origins
  // differ and login can fail.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendApiOrigin}/api/:path*`,
      },
    ];
  },
  experimental: {
    serverActions: {
      // Keep the default strict check in production builds; only relax it for
      // local development / tunnels. List production hosts via
      // SERVER_ACTIONS_ALLOWED_ORIGINS (comma-separated), NEXT_PUBLIC_APP_URL,
      // NEXT_PUBLIC_APP_URL_S1 and NEXT_PUBLIC_CLERK_APP_DOMAIN so Server
      // Actions POSTs don't trigger E80 "Invalid Server Actions request."
      allowedOrigins:
        process.env.NODE_ENV !== "production"
          ? [...devAllowedOrigins, ...extraOrigins]
          : [...prodAllowedOrigins, ...extraOrigins],
    },
  },
};

export default nextConfig;
