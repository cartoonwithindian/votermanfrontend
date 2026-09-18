"use client";

import React, { useState } from "react";
import { HelpCircle, Mail, ShieldAlert } from "lucide-react";
import { useSignIn, useClerk } from "@clerk/nextjs";
import { setAuthCookie } from "@/lib/mock-auth";
import type { UserRole } from "@/lib/auth-types";

/**
 * Clerk-powered email OTP sign-in (custom UI).
 *
 * Flow: email → Clerk sends a one-time code → verify → Clerk session active →
 * exchange the Clerk session token at POST /api/v1/auth/clerk-session →
 * backend session (cv_sid cookie + binding token) → dashboard.
 *
 * Roles are chosen in the parent page; they only affect where the user lands
 * and which portal gates apply — the backend re-derives the real role from
 * the verified Clerk email.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

type Stage = "email" | "code";

export function ClerkOtpLogin({
  role,
  portalLabel,
}: {
  role: UserRole;
  portalLabel: string;
}) {
  const { signIn } = useSignIn();
  const clerk = useClerk();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const toUserRole = (backendRole: unknown): UserRole => {
    switch (String(backendRole || "").toUpperCase()) {
      case "ADMIN":
        return "administrator";
      case "CAD":
        return "cad";
      case "CANDIDATE":
        return "candidate";
      default:
        return "student";
    }
  };

  const fetchCsrfToken = async (): Promise<string> => {
    try {
      const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      return data.data?.csrfToken || "";
    } catch {
      return "";
    }
  };

  // Clerk may deliver API failures either as a thrown ClerkError or as a
  // returned { error } — normalize both into { code, message }.
  const normalizeClerkError = (err: unknown): { code: string; message: string } | null => {
    if (!err) return null;
    const e = err as { code?: string; clerkError?: boolean; message?: string; longMessage?: string; errors?: Array<{ code?: string; message?: string; long_message?: string }> };
    if (e.errors && Array.isArray(e.errors) && e.errors.length > 0) {
      const first = e.errors[0];
      return { code: first.code || "", message: first.long_message || first.message || "Request failed." };
    }
    if (e.code || e.clerkError) {
      return { code: e.code || "", message: e.longMessage || e.message || "Request failed." };
    }
    return null;
  };

  const redirectToRegistration = () => {
    try {
      window.sessionStorage.setItem("campusvote_pending_email", email.trim().toLowerCase());
      window.sessionStorage.setItem("campusvote_pending_role", role);
    } catch {
      // Non-fatal.
    }
    window.location.href = "/register?from=login";
  };

  const sendCode = async () => {
    setError("");
    setNotice("");
    if (!signIn) {
      setError("Sign-in is still loading. Please try again in a moment.");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address to continue.");
      return;
    }
    setIsSending(true);
    try {
      const result = await signIn.emailCode.sendCode({
        emailAddress: email.trim().toLowerCase(),
      });
      const clerkErr = normalizeClerkError(result?.error);
      if (clerkErr) {
        // Unknown account — guide the user to registration instead of a raw error.
        if (clerkErr.code === "form_identifier_not_found") {
          redirectToRegistration();
          return;
        }
        setError(clerkErr.message);
        setIsSending(false);
        return;
      }
      setStage("code");
      setIsSending(false);
    } catch (err) {
      console.error("Clerk sendCode threw:", err);
      const clerkErr = normalizeClerkError(err);
      if (clerkErr && clerkErr.code === "form_identifier_not_found") {
        redirectToRegistration();
        return;
      }
      setError(clerkErr?.message || "Something went wrong while sending the code. Please try again.");
      setIsSending(false);
    }
  };

  const verifyAndBridge = async () => {
    setError("");
    if (!signIn) {
      setError("Sign-in is still loading. Please try again in a moment.");
      return;
    }
    if (!code || code.trim().length < 6) {
      setError("Enter the 6-digit code you received by email.");
      return;
    }
    setIsVerifying(true);
    try {
      const result = await signIn.emailCode.verifyCode({ code: code.trim() });
      const verifyErr = normalizeClerkError(result?.error);
      if (verifyErr) {
        setError(verifyErr.message);
        setIsVerifying(false);
        return;
      }

      // Activate the Clerk session, then exchange it for a backend session.
      const finalized = await signIn.finalize();
      if (finalized?.error && !clerk.session) {
        setError(finalized.error.longMessage || finalized.error.message || "Could not complete sign-in.");
        setIsVerifying(false);
        return;
      }

      // The active session can take a few hundred ms to settle after finalize.
      let token: string | null | undefined = null;
      for (let attempt = 0; attempt < 10; attempt++) {
        token = await clerk.session?.getToken({ skipCache: true });
        if (token) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (!token) {
        throw new Error("Clerk did not return a session token.");
      }

      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`${API_BASE}/auth/clerk-session`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          role: String(role).toUpperCase(),
          name: clerk.user?.fullName || clerk.user?.firstName || "",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Unknown backend account → send the user to registration with the email kept.
        if (response.status === 404 || data.data?.needsRegistration) {
          redirectToRegistration();
          return;
        }
        throw new Error(data.error?.message || "Unable to create the application session.");
      }

      const account = data.data?.user;
      const effectiveRole = toUserRole(account?.role);
      // The soft auth cookie lets the proxy (and client layouts) see that the
      // user is signed in; the backend cv_sid cookie is the real session.
      setAuthCookie(
        effectiveRole,
        account?.name || clerk.user?.fullName || "",
        account?.email || email.trim().toLowerCase()
      );
      const destination =
        role === "candidate" && effectiveRole === "student"
          ? "/candidate/apply"
          : effectiveRole === "administrator"
            ? "/admin/dashboard"
            : effectiveRole === "cad"
              ? "/cad/dashboard"
              : effectiveRole === "candidate"
                ? "/candidate/dashboard"
                : "/student/dashboard";

      // Full reload so all client state (session bindings, caches) is fresh.
      window.location.replace(destination);
    } catch (err) {
      console.error("Clerk verify/bridge threw:", err);
      const clerkErr = normalizeClerkError(err);
      setError(clerkErr?.message || (err instanceof Error ? err.message : "Something went wrong. Please try again."));
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    setCode("");
    setError("");
    setIsSending(true);
    try {
      if (signIn) {
        const result = await signIn.emailCode.sendCode({ emailAddress: email.trim().toLowerCase() });
        if (!result?.error) setNotice("A new code has been sent.");
      }
    } catch (err) {
      console.error("Clerk resend threw:", err);
      setError("Could not resend the code. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 text-center">
        Signing in as <strong>{portalLabel}</strong>
      </div>

      {notice && (
        <div className="mb-1 p-3 bg-primary-50 border border-primary-100 rounded-lg text-primary-800 text-sm break-words">
          {notice}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm break-words">
          {error}
        </div>
      )}

      {stage === "email" ? (
        <div className="space-y-1.5">
          <label htmlFor="clerk-email-input" className="text-xs font-medium text-text-secondary">
            Email address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="clerk-email-input"
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
            <button
              type="button"
              onClick={sendCode}
              disabled={isSending}
              className="w-full sm:w-auto shrink-0 px-4 py-2.5 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSending ? "Sending..." : "Send code"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg text-sm text-primary-800 flex items-start gap-2">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              We sent a one-time code to <strong>{email}</strong>. Enter it below to continue.
            </span>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="clerk-code-input" className="text-xs font-medium text-text-secondary">
              One-time code
            </label>
            <input
              id="clerk-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") verifyAndBridge();
              }}
              className="w-full px-4 py-2.5 text-sm bg-white dark:bg-[#252540] border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            type="button"
            onClick={verifyAndBridge}
            disabled={isVerifying}
            className="w-full px-4 py-2.5 text-sm font-medium rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isVerifying ? "Verifying…" : "Verify & Sign In"}
          </button>
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
        </>
      )}

      <div className="mt-6 pt-4 border-t border-border text-xs text-text-secondary text-center flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 leading-relaxed px-1">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        <span>Secured — verification codes are sent via email</span>
        <HelpCircle className="w-3 h-3 opacity-50 shrink-0" />
      </div>
    </div>
  );
}
