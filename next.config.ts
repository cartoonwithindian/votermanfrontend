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
// Includes the app's custom domain (students.made-a.tech), the Clerk s1
// subdomain that users mistakenly hit as the app host (s1.students.made-a.tech),
// the Clerk Frontend API hosts (clerk.*), and the Render onrender fallbacks.
// SERVER_ACTIONS_ALLOWED_ORIGINS adds any extra hosts (comma-separated) on
// top of this built-in list.
//
// The Clerk custom domain comes from NEXT_PUBLIC_CLERK_APP_DOMAIN (set in the
// env file); the satellite clerk.s1.<host> is derived from it. Defaults keep
// clerk.students.made-a.tech for existing deployments.
const clerkAppDomain = process.env.NEXT_PUBLIC_CLERK_APP_DOMAIN || "clerk.students.made-a.tech";
const clerkS1Domain =
  process.env.NEXT_PUBLIC_CLERK_APP_DOMAIN_S1 ||
  `clerk.s1.${clerkAppDomain.split(".").slice(1).join(".")}`;
const prodAllowedOrigins = [
  "students.made-a.tech",
  "s1.students.made-a.tech",
  clerkAppDomain,
  clerkS1Domain,
  "votermanfrontend.onrender.com",
  "votermanbackend.onrender.com",
  "made-a.tech",
  "www.made-a.tech",
];

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
      // local development / tunnels. For a production deployment behind a
      // proxy, set SERVER_ACTIONS_ALLOWED_ORIGINS to the public host(s),
      // e.g. SERVER_ACTIONS_ALLOWED_ORIGINS="vote.example.com"
      // s1.students.made-a.tech is included: users currently reach the app via
      // https://s1.students.made-a.tech/admin/... (Clerk's s1 subdomain) — that
      // host is the Clerk JWKS (https://clerk.s1...), not the app's canonical
      // host (students.made-a.tech). Allow both so Server Actions POSTs from
      // either host don't trigger E80 "Invalid Server Actions request."
      allowedOrigins:
        process.env.NODE_ENV !== "production"
          ? [...devAllowedOrigins, ...extraOrigins]
          : [...prodAllowedOrigins, ...extraOrigins],
    },
  },
};

export default nextConfig;
