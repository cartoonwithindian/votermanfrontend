import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const IS_STUDENT_PORTAL_CLOSED =
  process.env.NEXT_PUBLIC_STUDENT_PORTAL_CLOSED === "true";

// Canonical redirect for secondary hosts. Everything is env-driven so the app
// works on any deployment without hardcoding a domain:
//   - NEXT_PUBLIC_APP_URL     canonical app URL (e.g. https://app.example.com)
//   - NEXT_PUBLIC_ALT_HOSTS   comma-separated secondary hosts to 308-redirect
//                             to the canonical host (host, with or without scheme)
// When NEXT_PUBLIC_ALT_HOSTS is unset no canonical redirect happens.
const canonicalHost = (process.env.NEXT_PUBLIC_APP_URL || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "")
  .split(":")[0]
  .toLowerCase();
const altHosts = (process.env.NEXT_PUBLIC_ALT_HOSTS || "")
  .split(",")
  .map((h) => h.trim().replace(/^https?:\/\//, "").split(":")[0].toLowerCase())
  .filter(Boolean);
const S1_HOSTS = new Set(altHosts);
const CANONICAL_REDIRECT = process.env.S1_CANONICAL_REDIRECT !== "false"; // set "false" to serve secondary hosts directly without redirect

function maybeCanonicalRedirect(request: NextRequest): NextResponse | null {
  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (!canonicalHost || S1_HOSTS.size === 0 || !S1_HOSTS.has(host)) return null;
  // Don't redirect API / Next internals — they are same-origin XHR proxied to
  // BACKEND_API_ORIGIN via next.config rewrites; a redirect would add latency.
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return null;
  if (!CANONICAL_REDIRECT) return null;
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  url.host = canonicalHost;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

function appProxy(request: NextRequest) {
  const redirect = maybeCanonicalRedirect(request);
  if (redirect) return redirect;

  const { pathname } = request.nextUrl;

  // Student portal block (the login page itself always stays reachable —
  // signed-out visitors need it, and post-login routing handles the rest).
  if (
    IS_STUDENT_PORTAL_CLOSED &&
    pathname.startsWith("/student") &&
    !pathname.startsWith("/student/login")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/portal-closed";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Public routes — no auth check needed
  const PUBLIC_PREFIXES = [
    "/",
    "/login",
    "/student/login",
    "/candidate/login",
    "/register",
    "/admin",
    "/auth",
    "/portal-closed",
    "/email-recovery",
    "/reset-password",
    "/verify-email",
    "/api",
    "/_next",
    "/favicon",
  ];

  const isPublic = PUBLIC_PREFIXES.some((prefix) => {
    if (prefix === "/") return pathname === "/";
    return pathname.startsWith(prefix);
  });

  if (isPublic) {
    return NextResponse.next();
  }

  // For protected routes, check for the campusvote_auth cookie.
  // This is a soft check — the backend enforces real auth via cv_sid.
  // Signed-out visitors are sent to their portal's login page.
  const authCookie = request.cookies.get("campusvote_auth");
  if (!authCookie) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/candidate")) {
      url.pathname = "/student/login";
    } else if (pathname.startsWith("/student")) {
      url.pathname = "/student/login";
    } else {
      url.pathname = "/login/any";
    }
    url.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * When Clerk is configured, run clerkMiddleware so that the
 * /auth/clerk-callback page can resolve the signed-in Clerk session
 * (useAuth / getToken) and exchange it at the backend.
 *
 * Note: we deliberately do NOT call auth.protect() here — it would bounce
 * unauthenticated users to Clerk's hosted sign-in page instead of the app's
 * own /login flow (Clerk SignIn component / email OTP). Real authorization
 * is enforced by the backend (cv_sid session); the proxy only does the
 * soft-cookie redirect below.
 *
 * Without a Clerk key, only the plain app proxy runs (backend OTP flow).
 *
 * s1 safety: clerkMiddleware can throw when the request Host (a non-canonical
 * host) does not match the publishable key's domain. Wrap so such a request
 * never 500s — fall back to the plain proxy which still serves the page via
 * the backend OTP flow.
 */
const clerkHandler = hasClerkKey ? clerkMiddleware(async (_auth, req) => appProxy(req)) : null;

export default hasClerkKey && clerkHandler
  ? async function proxyWithClerk(request: NextRequest) {
      // Canonical redirect before invoking Clerk — avoids domain-mismatch errors.
      const redirect = maybeCanonicalRedirect(request);
      if (redirect) return redirect;
      try {
        // clerkMiddleware is a Next.js middleware factory; invoke it directly.
        // If it throws for the s1 host (domain mismatch) fall back gracefully.
        return (await (clerkHandler as unknown as (req: NextRequest) => Promise<NextResponse>)(request)) ?? appProxy(request);
      } catch (err) {
        console.warn("[proxy] clerkMiddleware failed, falling back to appProxy:", (err as Error)?.message);
        return appProxy(request);
      }
    }
  : function proxyWithoutClerk(request: NextRequest) {
      return appProxy(request);
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
