import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * Student portal closed banner — shown instead of all /student/* pages.
 * Controlled by NEXT_PUBLIC_STUDENT_PORTAL_CLOSED (see proxy.ts).
 */
export default function PortalClosedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <Lock className="w-14 h-14 text-primary-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Student portal is temporarily closed</h1>
        <p className="text-sm text-gray-600 mb-8">
          The student portal is unavailable right now. Check back later or contact the
          election administrator if you need assistance.
        </p>
        <Link
          href="/student/login"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition"
        >
          Go to login
        </Link>
      </div>
    </div>
  );
}