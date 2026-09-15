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

export default function ClerkCallbackContent() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const csrfRes = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
        const { data: csrfData } = await csrfRes.json();
        const csrfToken = csrfData?.csrfToken || "";

        const backendToken = await getToken();
        if (cancelled) return;

        const role =
          (user?.publicMetadata?.role as string) ||
          (user?.unsafeMetadata?.role as string) ||
          "STUDENT";

        const res = await fetch(`${API_BASE}/auth/clerk/verify-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify({
            token: backendToken,
            role,
          }),
        });

        if (cancelled) return;

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const msg = body?.error?.message || body?.message || `Error ${res.status}`;
          setError(msg);
          return;
        }

        const { data } = await res.json();

        if (data?.needsRegistration) {
          const redirectParams = new URLSearchParams({
            email: data.email,
            role: data.role,
            fromClerk: "1",
          });
          window.location.href = `/register/student?${redirectParams.toString()}`;
          return;
        }

        await setBindingToken(data?.sessionToken || data?.token || "");
        const userRole = toUserRole(data?.user?.role || role);
        const userName = user?.fullName || user?.firstName || "User";
        const userEmail = user?.emailAddresses?.[0]?.emailAddress || user?.primaryEmailAddress?.emailAddress || "";
        setAuthCookie(userRole, userName, userEmail);
        window.location.href = getDashboardRoute(userRole);
      } catch (err) {
        if (cancelled) return;
        console.error("Clerk callback error:", err);
        setError("Sign in failed. Please try again.");
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
