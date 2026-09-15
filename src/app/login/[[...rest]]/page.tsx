import { redirect } from "next/navigation";

/**
 * The old unified /login page is gone. Every old /login link now goes to
 * the student portal sign-in (/student/login); candidate sign-in lives at
 * /candidate/login. ?tab= and ?redirect_url= are preserved so registration
 * links and post-login returns still work. /login/admin and /login/cad are
 * separate routes and are unaffected.
 */
export default async function LoginRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = ((await searchParams) ?? {}) as Record<string, string | string[] | undefined>;
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;
  const tab = (first(params.tab) || "").toLowerCase();
  const redirectUrl = first(params.redirect_url);

  const q = new URLSearchParams();
  if (tab === "register" || tab === "login") q.set("tab", tab);
  if (redirectUrl) q.set("redirect_url", redirectUrl);
  const qs = q.toString();
  redirect(qs ? `/student/login?${qs}` : "/student/login");
}