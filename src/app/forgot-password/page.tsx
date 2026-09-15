"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, MailQuestion } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/Button";

/**
 * Forgot password. Student and candidate accounts can sign in with their
 * password or a one-time code sent to their email — anyone can get in with a
 * fresh code, so there is no password to reset. If the email itself is
 * unreachable, the admin-approved recovery flow handles email changes.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <AuthHeader
            title="Forgot your password?"
            subtitle="No worries — sign in with a one-time code instead."
          />
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl text-sm text-primary-800 flex items-start gap-3">
            <MailQuestion className="w-5 h-5 mt-0.5 shrink-0" />
            <p>
              Enter your email on the sign-in page, choose{" "}
              <strong>One-time code</strong>, and use the code we send to it. No need to
              remember your password.
            </p>
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            If you can&apos;t receive the code (for example your email is no longer accessible), use
            the recovery form and an election administrator will help you update your account.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <Link href="/student/login" className="w-full">
              <Button variant="primary" size="md" className="w-full">
                Back to sign in
              </Button>
            </Link>
            <Link href="/email-recovery" className="w-full">
              <Button variant="outline" size="md" className="w-full">
                Can&apos;t access your email?
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border text-xs text-text-secondary text-center flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 leading-relaxed px-1">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Having trouble signing in? Contact your college election administrator.
          </span>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}