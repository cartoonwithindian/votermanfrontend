"use client";

// This page is loaded dynamically (via page.tsx) to avoid static generation
// because Clerk's useAuth hook requires ClerkProvider context.

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { setBindingToken } from "@/lib/session-binding";
import { setAuthCookie } from "@/lib/mock-auth";
import { destinationForPortal } from "@/lib/dashboard-route";
import type { UserRole } from "@/lib/auth-types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

function toUserRole(role: unknown): UserRole {
  switch (String(role || "").toUpperCase()) {
    case "ADMIN":
      return "administrator";
    case "CAD":
      return "cad";
    case "CANDIDATE":
      return "candidate";
    default:
      return "student";
  }
}

export default function ClerkCallbackContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [error, setError] = useState("");

  // Stale visit guard: if Clerk never reports a session (no OAuth
  // round-trip just happened), stop spinning and send the user back
  // instead of hanging on the loader forever.
  useEffect(() => {
    if (!isLoaded || isSignedIn || error) return;
    const t = setTimeout(() => {
      setError("We couldn't find a sign-in session. Please try signing in again.");
    }, 8000);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, error]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const csrfResponse = await fetch(`${API_BASE}/auth/csrf`, {
          credentials: "include",
        });
        const csrfData = await csrfResponse.json().catch(() => ({}));
        const csrfToken = csrfData.data?.csrfToken || "";
        const token = await getToken({ skipCache: true });
        const requestedRole = new URLSearchParams(window.location.search).get("role") || "student";

        if (!token) {
          throw new Error("Clerk did not return a session token.");
        }

        const response = await fetch(`${API_BASE}/auth/clerk-session`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            role: requestedRole,
            name: user?.fullName || user?.firstName || "",
          }),
        });

        if (cancelled) return;

        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body.error?.message || "Unable to create the application session.");
        }

        const account = body.data?.user;
        const role = toUserRole(account?.role);
        if (body.data?.bindingToken) setBindingToken(body.data.bindingToken);
        if (account) {
          setAuthCookie(
            role,
            account.name || user?.fullName || "",
            account.email || user?.primaryEmailAddress?.emailAddress || ""
          );
        }

        // Portal-sticky routing: the portal the user started from decides
        // where they land — the backend role never pulls them across
        // portals. (CandidateLayout bounces unapproved applicants from the
        // dashboard to /candidate/status.)
        const portal = requestedRole === "candidate" ? "candidate" : "student";
        const destination = destinationForPortal(portal, account?.role);
        if (!cancelled) window.location.replace(destination);
      } catch (err) {
        if (cancelled) return;
        console.error("Clerk callback error:", err);
        setError(err instanceof Error ? err.message : "Unable to complete sign in.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn, user]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-red-700">Sign in failed</h1>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <Link className="mt-4 inline-block text-sm text-primary-600 hover:underline" href="/student/login">
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
        <p className="text-sm text-gray-600">Completing secure sign in…</p>
      </div>
    </div>
  );
}
