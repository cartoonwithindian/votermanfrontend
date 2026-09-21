"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldX } from "lucide-react";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

/**
 * Access Denied page — the landing spot for cross-role access attempts.
 * Offers a return to the user's actual dashboard when signed in.
 */
export default function AccessDeniedPage() {
  const [homeHref, setHomeHref] = useState("/student/login");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        const role = String(data?.data?.user?.role || "").toUpperCase();
        const map: Record<string, string> = {
          ADMIN: "/admin/dashboard",
          CAD: "/cad/dashboard",
          CANDIDATE: "/student/dashboard",
          STUDENT: "/student/dashboard",
        };
        if (map[role]) setHomeHref(map[role]);
      } catch {
        /* stay on /login */
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <ShieldX className="w-14 h-14 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h1>
        <p className="text-sm text-gray-600 mb-8">
          You do not have permission to access this page. If you believe this is a mistake,
          contact the election administrator.
        </p>
        <Link
          href={homeHref}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
        >
          Return to your dashboard
        </Link>
      </div>
    </div>
  );
}
