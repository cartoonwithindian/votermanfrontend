"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  Loader2,
  Mail,
  UserPlus,
  Hash,
  Mic,
  Phone,
} from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { setBindingToken } from "@/lib/session-binding";
import { setAuthCookie } from "@/lib/mock-auth";
import { getDashboardRoute } from "@/lib/dashboard-route";
import { SignUp } from "@clerk/nextjs";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

type Stage = "email" | "code" | "info";
export type RegisterPortal = "any" | "candidate" | "student";

const PORTAL_TITLES: Record<RegisterPortal, string> = {
  any: "Create your account",
  candidate: "Candidate Registration",
  student: "Student Registration",
};

export function RoleRegisterPage({ portal }: { portal: RegisterPortal }) {
  const [selectedRole] = useState<"candidate" | "student">("candidate");

  const [stage, setStage] = useState<Stage>("email");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [tempPassword] = useState(() => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    const arr = new Uint8Array(20);
    crypto.getRandomValues(arr);
    return Array.from(arr, (b) => chars[b % chars.length]).join("");
  });

  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const callbackUrl = `/auth/clerk-callback?role=${encodeURIComponent(selectedRole)}`;
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center mb-6">
            <AuthHeader
              title={PORTAL_TITLES[portal]}
              subtitle="Create your secure CampusVote account"
            />
          </div>
          <SignUp
            routing="hash"
            forceRedirectUrl={callbackUrl}
            fallbackRedirectUrl={callbackUrl}
            signInUrl="/login"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0 w-full",
              },
            }}
          />
        </AuthCard>
      </AuthLayout>
    );
  }

  const fetchCsrfToken = async (): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      return data.data?.csrfToken || "";
    } catch {
      return "";
    }
  };

  const sendCode = async () => {
    setError("");
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    setIsSending(true);
    try {
      const normalized = email.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      const res = await fetch(`${API_BASE}/auth/register/otp`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalized,
          username: normalized.split("@")[0],
          password: tempPassword,
          confirmPassword: tempPassword,
          role: selectedRole.toUpperCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error?.message?.includes("already") || data.error?.message?.includes("exists")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(data.error?.message || "Could not send verification code. Please try again.");
        }
        setIsSending(false);
        return;
      }

      setStage("code");
      setIsSending(false);
    } catch (err) {
      console.error("sendCode threw:", err);
      setError("Something went wrong. Please try again.");
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (!code || code.trim().length < 4) {
      setError("Enter the code you received by email.");
      return;
    }
    setIsVerifying(true);
    try {
      const normalized = email.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      const res = await fetch(`${API_BASE}/auth/register/verify`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalized,
          otp: code.trim(),
          username: normalized.split("@")[0],
          fullName: fullName.trim() || normalized.split("@")[0],
          password: tempPassword,
          role: selectedRole.toUpperCase(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error?.message || "Invalid or expired code. Please try again.");
        setIsVerifying(false);
        return;
      }

      // Registration verified — store session and redirect
      if (data.data?.bindingToken) {
        setBindingToken(data.data.bindingToken);
      }
      if (data.data?.user) {
        const user = data.data.user;
        setAuthCookie(selectedRole as any, user.name || user.fullName || normalized.split("@")[0], user.email || normalized);
      }

      const dest = getDashboardRoute(selectedRole.toUpperCase());
      window.location.href = dest;
    } catch (err) {
      console.error("verifyCode threw:", err);
      setError("Something went wrong. Please try again.");
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    setCode("");
    setError("");
    setIsSending(true);
    try {
      const normalized = email.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      await fetch(`${API_BASE}/auth/otp/send-login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalized,
          role: selectedRole.toUpperCase(),
        }),
      });
    } catch (err) {
      console.error("Resend failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <AuthHeader
            title={PORTAL_TITLES[portal]}
            subtitle={
              stage === "email"
                ? "Enter your email to get started"
                : stage === "code"
                  ? "Verify your email with the code we sent"
                  : "Complete your profile to finish registration"
            }
          />
        </div>

        {notice && (
          <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm break-words">
            {notice}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/login" className="font-medium underline">
                Sign in instead
              </Link>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm break-words">
            {error}
          </div>
        )}

        {/* Stage 1: Email */}
        {stage === "email" && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 text-center flex items-center justify-center gap-2">
              <Mic className="w-4 h-4 shrink-0" />
              <span>
                Registering as <strong>Candidate</strong>
              </span>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-xs font-medium text-text-secondary">
                Email address
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendCode();
                  }}
                  className="flex-1 min-w-0 px-4 py-2.5 text-sm bg-white dark:bg-[#252540] border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <Button
                  onClick={sendCode}
                  disabled={isSending}
                  isLoading={isSending}
                  className="w-full sm:w-auto shrink-0"
                >
                  {!isSending && "Send code"}
                </Button>
              </div>
            </div>

            <p className="text-xs text-text-secondary text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Stage 2: OTP Code */}
        {stage === "code" && (
          <div className="space-y-4">
            <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm text-primary-800 flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                We sent a one-time code to <strong>{email}</strong>. Enter it below.
              </span>
            </div>
            <Input
              id="register-code"
              label="One-time code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") verifyCode();
              }}
            />
            <Button
              onClick={verifyCode}
              disabled={isVerifying}
              isLoading={isVerifying}
              className="w-full"
            >
              {!isVerifying && "Verify code"}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-text-secondary">
              <button
                type="button"
                onClick={resendCode}
                disabled={isSending}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                {isSending ? "Sending..." : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("email");
                  setCode("");
                  setError("");
                }}
                className="text-text-muted hover:text-text-secondary font-medium"
              >
                Use a different email
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border text-xs text-text-secondary text-center flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 leading-relaxed px-1">
          {isVerifying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : (
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {stage === "email"
              ? "Enter your email to receive a one-time verification code"
              : "Enter the 6-digit code sent to your email"}
          </span>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
