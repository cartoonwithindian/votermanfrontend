"use client";

import React, { useEffect, useState } from "react";
import { Mail, KeyRound } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { setBindingToken } from "@/lib/session-binding";
import { setAuthCookie } from "@/lib/mock-auth";
import { getDashboardRoute } from "@/lib/dashboard-route";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

type Stage = "email" | "code";

const PORTAL_TITLES = {
  student: "Student Registration",
  candidate: "Candidate Registration",
} as const;

const PORTAL_SUBTITLES = {
  student: "Create your student account to vote in the elections",
  candidate: "Create your account to apply as an election candidate",
} as const;

const REGISTER_LINKS = {
  student: "/register/student",
  candidate: "/register/candidate",
} as const;

/**
 * Per-role registration. The student and candidate forms call SEPARATE
 * backend APIs (/auth/register/student/*, /auth/register/candidate/*) so
 * the two flows can never cross-wire roles — the role is fixed by which
 * page the user is on, not by a picker.
 */
export function RoleRegisterPage({ portal }: { portal: "student" | "candidate" }) {
  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem("campusvote_pending_email");
      if (pending) {
        setEmail(pending);
        sessionStorage.removeItem("campusvote_pending_email");
        sessionStorage.removeItem("campusvote_pending_role");
        setNotice("Complete your registration to finish signing in.");
      }
    } catch {
      // Non-fatal.
    }
  }, []);

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
    setNotice("");
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Create a password for your account.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSending(true);
    try {
      const normalized = email.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      // ROLE-SPECIFIC ENDPOINT: student and candidate call different APIs.
      const endpoint =
        portal === "student"
          ? `${API_BASE}/auth/register/student/otp`
          : `${API_BASE}/auth/register/candidate/otp`;

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalized,
          username: normalized.split("@")[0],
          password,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error?.message?.includes("already") || data.error?.message?.includes("exists")) {
          setError("This email is already registered. Please sign in instead.");
        } else {
          setError(data.error?.message || "Could not send the verification code. Please try again.");
        }
        setIsSending(false);
        return;
      }

      setNotice(
        portal === "student"
          ? "Student registration code sent to your email."
          : "Candidate registration code sent to your email."
      );
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

      // ROLE-SPECIFIC ENDPOINT (matches the send step above).
      const endpoint =
        portal === "student"
          ? `${API_BASE}/auth/register/student/verify`
          : `${API_BASE}/auth/register/candidate/verify`;

      const res = await fetch(endpoint, {
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
          fullName: normalized.split("@")[0],
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error?.message || "Invalid or expired code. Please try again.");
        setIsVerifying(false);
        return;
      }

      // Route by the role THIS registration page created.
      if (data.data?.bindingToken) {
        setBindingToken(data.data.bindingToken);
      }
      if (data.data?.user) {
        const user = data.data.user;
        setAuthCookie(portal, user.name || user.fullName || normalized.split("@")[0], user.email || normalized);
      }

      const dest = getDashboardRoute(portal.toUpperCase());
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

      const endpoint =
        portal === "student"
          ? `${API_BASE}/auth/register/student/otp`
          : `${API_BASE}/auth/register/candidate/otp`;

      await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalized,
          username: normalized.split("@")[0],
          password,
          confirmPassword: password,
        }),
      });
      setNotice("A new code has been sent.");
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
            subtitle={stage === "email" ? PORTAL_SUBTITLES[portal] : `Enter the code sent to ${email}`}
          />
        </div>

        {notice && (
          <div className="mb-4 p-3 bg-primary-50 border border-primary-100 rounded-lg text-primary-800 text-sm break-words">
            {notice}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm break-words">
            {error}
          </div>
        )}

        {stage === "email" ? (
          <div className="space-y-4">
            <Input
              id="register-email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="register-password"
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              id="register-confirm-password"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendCode();
              }}
            />
            <Button
              onClick={sendCode}
              disabled={isSending}
              isLoading={isSending}
              className="w-full"
            >
              {!isSending && (
                <>
                  <Mail className="w-4 h-4" />
                  Send verification code
                </>
              )}
            </Button>
            <div className="text-center text-xs text-text-secondary">
              Already have an account?{" "}
              <a href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm text-primary-800 flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                We sent a one-time code to <strong>{email}</strong>. Enter it below to finish your {portal} registration.
              </span>
            </div>
            <Input
              id="register-code-input"
              label="Verification code"
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
              {!isVerifying && (
                <>
                  <KeyRound className="w-4 h-4" />
                  Create my account
                </>
              )}
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
                  setNotice("");
                }}
                className="text-text-muted hover:text-text-secondary font-medium"
              >
                Use a different email
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-border text-xs text-text-secondary text-center">
          {portal === "student" ? (
            <>
              Want to run in the election?{" "}
              <a href={REGISTER_LINKS.candidate} className="text-primary-600 hover:text-primary-700 font-medium">
                Register as a candidate instead
              </a>
            </>
          ) : (
            <>
              Just want to vote?{" "}
              <a href={REGISTER_LINKS.student} className="text-primary-600 hover:text-primary-700 font-medium">
                Register as a student instead
              </a>
            </>
          )}
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
