"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { setBindingToken } from "@/lib/session-binding";
import { setAuthCookie } from "@/lib/mock-auth";
import { getDashboardRoute } from "@/lib/dashboard-route";
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

export default function ClerkCallbackPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [error, setError] = useState("");

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
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error?.message || "Unable to create the application session.");
        }

        const account = data.data?.user;
        const role = toUserRole(account?.role);
        if (data.data?.bindingToken) setBindingToken(data.data.bindingToken);
        if (account) {
          setAuthCookie(role, account.name || user?.fullName || "", account.email || user?.primaryEmailAddress?.emailAddress || "");
        }

        // The backend account role decides the destination — never the
        // portal the user started from. (CandidateLayout bounces unapproved
        // applicants from the dashboard to /candidate/status.)
        const destination = getDashboardRoute(role);
        if (!cancelled) window.location.replace(destination);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to complete sign in.");
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
          <Link className="mt-4 inline-block text-sm text-primary-600 hover:underline" href="/login">
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
