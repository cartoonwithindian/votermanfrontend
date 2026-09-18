"use client";

import React, { useEffect, useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { useClerk, useSignUp } from "@clerk/nextjs";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { setBindingToken } from "@/lib/session-binding";
import { setAuthCookie } from "@/lib/mock-auth";
import { destinationForPortal } from "@/lib/dashboard-route";
import type { UserRole } from "@/lib/auth-types";

/**
 * Clerk-powered registration (custom UI).
 *
 * Flow: email + name + roll + mobile + password → Clerk sends a one-time code
 * → code verified → the Clerk session token is exchanged at
 * POST /api/v1/auth/register/clerk → backend session (cv_sid + binding
 * token) → portal dashboard.
 *
 * The email OTP is sent by Clerk, not Brevo — so registration works even
 * when BREVO_API_KEY is unset on the live backend.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

type Stage = "email" | "code";

interface ClerkRegisterPanelProps {
  portal: "student" | "candidate";
  initialEmail?: string;
  onGoLogin: () => void;
}

export function ClerkRegisterPanel({ portal, initialEmail = "", onGoLogin }: ClerkRegisterPanelProps) {
  const { signUp } = useSignUp();
  const clerk = useClerk();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState(initialEmail);
  const [fullName, setFullName] = useState("");
  const [roll, setRoll] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const normalizeClerkError = (err: unknown): { code: string; message: string } | null => {
    if (!err) return null;
    const e = err as { code?: string; message?: string; longMessage?: string; errors?: Array<{ code?: string; message?: string; long_message?: string }> };
    if (e.errors && Array.isArray(e.errors) && e.errors.length > 0) {
      const first = e.errors[0];
      return { code: first.code || "", message: first.long_message || first.message || "Request failed." };
    }
    if (e.code || e.longMessage || e.message) {
      return { code: e.code || "", message: e.longMessage || e.message || "Request failed." };
    }
    return null;
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

  const go = (dest: string) => {
    try {
      sessionStorage.removeItem("campusvote_bridged");
      sessionStorage.setItem("campusvote_dest", dest);
    } catch {
      // Non-fatal.
    }
    window.location.href = dest;
  };

  const sendCode = async () => {
    setError("");
    setNotice("");
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!password || password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }
    if (portal === "student" && !roll.trim()) {
      setError("Enter your roll / enrollment number to register as a student.");
      return;
    }
    if (!mobile || mobile.replace(/\D/g, "").length !== 10) {
      setError("Mobile number must be 10 digits.");
      return;
    }
    if (!signUp) {
      setError("Sign-up is still loading. Please try again in a moment.");
      return;
    }
    setIsSending(true);
    try {
      const created = await signUp.create({ emailAddress: email.trim().toLowerCase() });
      const createErr = normalizeClerkError(created?.error);
      if (createErr) {
        setError(
          createErr.code === "form_identifier_exists"
            ? "This email is already registered. Please sign in instead."
            : createErr.message
        );
        setIsSending(false);
        return;
      }
      const sent = await signUp.verifications.sendEmailCode();
      const sendErr = normalizeClerkError(sent?.error);
      if (sendErr) {
        setError(sendErr.message);
        setIsSending(false);
        return;
      }
      setStage("code");
      setNotice(
        portal === "student"
          ? "Student registration code sent to your email."
          : "Candidate registration code sent to your email."
      );
    } catch (err) {
      console.error("Clerk signUp create threw:", err);
      const clerkErr = normalizeClerkError(err);
      const code = clerkErr?.code || "";
      const msg = clerkErr?.message || "Could not send the verification code. Please try again.";
      if (code === "form_identifier_exists") {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(msg);
      }
    } finally {
      setIsSending(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (!code || code.trim().length !== 6) {
      setError("Enter the 6-digit code you received by email.");
      return;
    }
    if (!signUp) {
      setError("Sign-up is still loading. Please try again in a moment.");
      return;
    }
    setIsVerifying(true);
    try {
      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      const verifyErr = normalizeClerkError(result?.error);
      if (verifyErr) {
        setError(verifyErr.message);
        setIsVerifying(false);
        return;
      }

      // Activate the Clerk session, then exchange it for a backend session.
      if (signUp.createdSessionId) {
        const fin = await signUp.finalize();
        if (fin?.error) {
          setError(fin.error.longMessage || fin.error.message || "Could not complete registration.");
          setIsVerifying(false);
          return;
        }
      }

      const token = await clerk.session?.getToken({ skipCache: true });
      if (!token) {
        throw new Error("Clerk did not return a session token.");
      }

      const csrfToken = await fetchCsrfToken();
      const response = await fetch(`${API_BASE}/auth/register/clerk`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          rollNumber: roll.trim(),
          mobileNumber: mobile.trim(),
          password,
          role: portal.toUpperCase(),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 409 || data.error?.code === "EMAIL_EXISTS") {
          setError("This email is already registered. Please sign in instead.");
          setIsVerifying(false);
          return;
        }
        throw new Error(data.error?.message || "Unable to create your account. Please try again.");
      }

      if (data.data?.bindingToken) setBindingToken(data.data.bindingToken);
      const account = data.data?.user;
      const effectiveRole = String(account?.role || "").toUpperCase();
      const cookieRole: UserRole =
        effectiveRole === "CANDIDATE" || effectiveRole === "CAD" || effectiveRole === "ADMINISTRATOR"
          ? (effectiveRole.toLowerCase() as UserRole)
          : portal;
      if (account) {
        setAuthCookie(cookieRole, account.name || fullName.trim(), account.email || email.trim().toLowerCase());
      }
      go(destinationForPortal(portal, account?.role));
    } catch (err) {
      console.error("Clerk register verify/bridge threw:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsVerifying(false);
    }
  };

  const resendCode = async () => {
    setCode("");
    setError("");
    if (!signUp) return;
    setIsSending(true);
    try {
      const sent = await signUp.verifications.sendEmailCode();
      if (!normalizeClerkError(sent?.error)) {
        setNotice("A new code has been sent.");
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
      {notice && (
        <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg text-primary-800 text-sm break-words">
          {notice}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm break-words">
          {error}
        </div>
      )}

      {stage === "email" ? (
        <div className="space-y-4">
          <Input
            id="reg-email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="reg-full-name"
            label="Full name"
            type="text"
            autoComplete="name"
            placeholder="As written on your student record"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            id="reg-roll"
            label={portal === "student" ? "Roll / enrollment number" : "Roll / enrollment number (optional)"}
            type="text"
            autoCapitalize="characters"
            placeholder="e.g. 21CS01"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
          />
          <Input
            id="reg-mobile"
            label="Mobile number"
            type="tel"
            autoComplete="tel"
            placeholder="10-digit mobile number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
          />
          <Input
            id="reg-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 12 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            id="reg-confirm"
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
          <Button onClick={sendCode} disabled={isSending} isLoading={isSending} className="w-full">
            {!isSending && (
              <>
                <Mail className="w-4 h-4" />
                Send verification code
              </>
            )}
          </Button>
          <div className="text-center text-xs text-text-secondary">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onGoLogin}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign in
            </button>
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
            id="reg-code"
            label="Verification code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter") verifyCode();
            }}
          />
          <Button onClick={verifyCode} disabled={isVerifying} isLoading={isVerifying} className="w-full">
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
    </div>
  );
}