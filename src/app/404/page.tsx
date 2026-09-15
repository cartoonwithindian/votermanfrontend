"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Compass, LogIn } from "lucide-react";

/**
 * Canonical 404 page. Rendered BOTH at /404 (Vercel platform 404 route)
 * and as app/not-found (unknown routes). Never uses history.back(): a
 * back-navigation into a stale auth URL is what previously trapped users
 * in the 404 loop. Auth-looking paths get a "Back to Sign In" instead.
 */
export default function NotFoundPage() {
  const [cameFromAuth, setCameFromAuth] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCameFromAuth(window.location.pathname.startsWith("/auth/"));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md w-full bg-white rounded-[20px] border border-border p-6 sm:p-10">
        <p className="text-6xl font-bold text-primary-600 mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Page Not Found</h1>
        <p className="text-sm text-gray-600 mb-2">
          The page you are looking for does not exist or has been moved.
        </p>
        <p className="text-xs text-gray-500 mb-8">Error Code: 404</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
          >
            <Compass className="w-4 h-4 mr-2" />
            Go Back Home
          </Link>
          {cameFromAuth ? (
            <Link
              href="/student/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
          ) : (
            <Link
              href="/student/login"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
