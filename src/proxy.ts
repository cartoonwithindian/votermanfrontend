import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const IS_STUDENT_PORTAL_CLOSED =
  process.env.NEXT_PUBLIC_STUDENT_PORTAL_CLOSED === "true";

function appProxy(request: NextRequest) {
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
      url.pathname = "/candidate/login";
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
 */
export default hasClerkKey
  ? clerkMiddleware(async (_auth, req) => appProxy(req))
  : function proxyWithoutClerk(request: NextRequest) {
      return appProxy(request);
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
