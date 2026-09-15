"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api/v1";
import { getDashboardRoute } from "@/lib/dashboard-route";
import { Loader2 } from "lucide-react";

/**
 * Root — sends already-authenticated users to their role's dashboard and
 * everyone else to /login. The backend session (getMe) is the source of
 * truth for the role, never client state.
 *
 * If the user just signed out (campusvote_signed_out flag in sessionStorage),
 * skip the getMe() check entirely and go straight to /login. This prevents
 * a stale backend session (cv_sid cookie) from causing a redirect loop
 * through /portal-closed.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    // If user just signed out, skip backend check and go to login.
    try {
      const justSignedOut = sessionStorage.getItem("campusvote_signed_out");
      if (justSignedOut) {
        sessionStorage.removeItem("campusvote_signed_out");
        router.replace("/student/login");
        return;
      }
    } catch {
      // Private mode — continue with normal flow.
    }

    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (me.authenticated && me.user) {
          const role = String(me.user.role || "").toUpperCase();
          router.replace(getDashboardRoute(role));
          return;
        }
        router.replace("/student/login");
      } catch {
        if (!cancelled) router.replace("/student/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
        <p className="text-sm text-gray-600">Checking your session…</p>
      </div>
    </div>
  );
}
