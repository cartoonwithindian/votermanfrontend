"use client";

import { useCallback } from "react";
import { api } from "@/lib/api/client";
import { clearAuthCookie } from "@/lib/mock-auth";
import { clearBindingToken } from "@/lib/session-binding";

declare global {
  interface Window {
    Clerk?: { signOut?: () => Promise<void> };
  }
}

/**
 * Shared sign-out for every Sign Out button in the app.
 *
 * 1. Backend session (POST /api/v1/auth/logout)
 * 2. Clerk session (window.Clerk.signOut, when Clerk is configured) — without
 *    this, an active Google session would bounce the user straight back in
 *    the next time they open /login.
 * 3. Clear client-side auth state (cookies, sessionStorage)
 * 4. Redirect to /login
 */
export function useSignOut() {
  return useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // No backend session or network issue - continue signing out locally.
    }

    // End the Clerk session if Clerk is loaded (no-op otherwise). Guarded with
    // a timeout so a hung sign-out never blocks the local cleanup below.
    if (typeof window !== "undefined" && window.Clerk?.signOut) {
      try {
        await Promise.race([
          window.Clerk.signOut(),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch {
        // Clerk sign-out failure is non-fatal — local state is cleared below.
      }
    }

    clearAuthCookie();
    clearBindingToken();

    try {
      const keys = Object.keys(window.sessionStorage);
      keys
        .filter((k) => k.startsWith("campusvote_"))
        .forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // Private mode etc. - non-fatal.
    }

    try {
      window.sessionStorage.setItem("campusvote_signed_out", "1");
    } catch {
      // Non-fatal.
    }

    // Redirect to the student login — forces a full page reload so no stale state remains.
    window.location.href = "/student/login";
  }, []);
}
