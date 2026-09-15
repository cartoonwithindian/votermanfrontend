"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * Password reset is not applicable: student and candidate accounts sign in
 * with a one-time code sent by email (no password). This page explains that
 * instead of offering a dead form.
 */
export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center py-6">
          <ShieldCheck className="w-10 h-10 text-primary-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">No password needed</h1>
          <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
            Student and candidate accounts sign in with a one-time code sent to their email —
            there is no password to set or reset.
          </p>
          <Link
            href="/student/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            Go to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
