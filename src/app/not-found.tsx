"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, LogIn } from "lucide-react";

export default function NotFound() {
  const [cameFromAuth, setCameFromAuth] = useState(false);

  useEffect(() => {
    // Auth URLs (callback/roll-number etc.) only make sense mid-flow — if a
    // stale or mangled auth link 404s, the safest way back is the login page.
    if (typeof window !== "undefined") {
      setCameFromAuth(window.location.pathname.startsWith("/auth/"));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-primary-600 mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-sm text-gray-600 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
          >
            <Compass className="w-4 h-4 mr-2" />
            Go Back Home
          </Link>
          <Link
            href="/student/login"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
          >
            <LogIn className="w-4 h-4 mr-2" />
            {cameFromAuth ? "Back to Sign In" : "Sign In"}
          </Link>
        </div>
      </div>
    </div>
  );
}
