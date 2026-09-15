"use client";

import React, { useEffect, useState } from "react";
import { GraduationCap, Mic, KeyRound, Mail } from "lucide-react";
import { useSignIn } from "@clerk/nextjs";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { setBindingToken } from "@/lib/session-binding";
import { setAuthCookie } from "@/lib/mock-auth";
import type { UserRole } from "@/lib/auth-types";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

// Same flag as RootLayout: ClerkProvider only wraps the app when a key exists.
const CLERK_ENABLED = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

type Portal = "student" | "candidate";
type Mode = "login" | "register";

/**
 * Single home for Student + Candidate auth. Sign in and registration live on
 * one page behind a role toggle; the backend's ACTUAL account role decides
 * where the user lands — the picked portal/tab never does. STUDENT (and any
 * other non-elevated role) always lands on the student dashboard; CANDIDATE
 * lands on the candidate dashboard (its layout bounces unapproved applicants
 * to /candidate/status).
 */
function destinationFor(_portal: Portal, backendRole: string | undefined): string {
  void _portal;
  switch (String(backendRole || "").toUpperCase()) {
    case "ADMIN":
      return "/admin/dashboard";
    case "CAD":
      return "/cad/dashboard";
    case "CANDIDATE":
      return "/candidate/dashboard";
    default:
      return "/student/dashboard";
  }
}

function toCookieRole(backendRole: string | undefined, fallback: Portal): UserRole {
  const r = String(backendRole || "").toLowerCase();
  if (r === "candidate" || r === "cad" || r === "administrator" || r === "student") return r as UserRole;
  return fallback;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.44 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.29a12 12 0 0 0 0 10.76l3.98-3.1z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.42-3.42A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
    </svg>
  );
}

function GoogleSignInButton({ role }: { role: Portal }) {
  const { signIn } = useSignIn();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    if (!signIn) return;
    setBusy(true);
    setError("");
    try {
      const callback = `${window.location.origin}/auth/clerk-callback?role=${encodeURIComponent(role)}`;
      await signIn.sso({
        strategy: "oauth_google",
        redirectUrl: callback,
        redirectCallbackUrl: callback,
      });
    } catch (err) {
      console.error("Google sign-in failed:", err);
      setError("Google sign-in could not start. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="outline" onClick={start} disabled={busy || !signIn} isLoading={busy} className="w-full">
        {!busy && (
          <>
            <GoogleIcon />
            Continue with Google
          </>
        )}
      </Button>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm break-words">
          {error}
        </div>
      )}
    </div>
  );
}

export function UnifiedAuthPage({
  initialPortal = "student",
  lockPortal = false,
}: {
  /** Which portal tab is selected first. Defaults to "student". */
  initialPortal?: Portal;
  /**
   * When true the Student/Candidate toggle is hidden and the portal stays
   * fixed — used by the dedicated /student/login and /candidate/login pages.
   * The backend account role still decides the final dashboard.
   */
  lockPortal?: boolean;
} = {}) {
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [mode, setMode] = useState<Mode>("login");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Registration state (email + password, then OTP code step)
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [code, setCode] = useState("");
  const [regStage, setRegStage] = useState<"email" | "code">("email");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Deep links: /login?role=candidate, /login?tab=register&role=student
  // (old /register/* pages redirect here). Also picks up the pending email
  // left by a failed sign-in that needs registration. Locked portal pages
  // (/student/login, /candidate/login) ignore role hints and stay fixed.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!lockPortal) {
        const r = params.get("role")?.toLowerCase();
        if (r === "candidate" || r === "student") setPortal(r);
      }
      const t = params.get("tab")?.toLowerCase();
      if (t === "register" || t === "login") setMode(t);
      const pending = sessionStorage.getItem("campusvote_pending_email");
      if (pending) {
        if (!lockPortal) {
          const pendingRole = sessionStorage.getItem("campusvote_pending_role");
          if (pendingRole === "candidate" || pendingRole === "student") setPortal(pendingRole);
        }
        setRegEmail(pending);
        setMode("register");
        setNotice("Complete your registration to finish signing in.");
        sessionStorage.removeItem("campusvote_pending_email");
        sessionStorage.removeItem("campusvote_pending_role");
      }
      const flagged = sessionStorage.getItem("campusvote_role_mismatch");
      if (flagged) {
        setError("This account is not authorized for this portal. Sign in from the correct portal for your role.");
        sessionStorage.removeItem("campusvote_role_mismatch");
      }
    } catch {
      // Non-fatal.
    }
  }, [lockPortal]);

  const switchPortal = (p: Portal) => {
    if (lockPortal) return;
    setPortal(p);
    setError("");
    setNotice("");
    setRegStage("email");
    setCode("");
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
    setNotice("");
    setRegStage("email");
    setCode("");
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

  // ---------- Sign in (email + password) ----------
  const login = async () => {
    setError("");
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const normalized = email.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        // No role sent on purpose: the backend returns the account's real
        // role and routing never depends on the picked toggle.
        body: JSON.stringify({ userIdentifier: normalized, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 404 || data.data?.needsRegistration) {
          // Unknown email: say so on the sign-in form and carry the email
          // over so the Register tab picks it up — but stay here.
          setRegEmail(normalized);
          setError("No account found for this email. Please register first.");
          setIsLoggingIn(false);
          return;
        }
        if (res.status === 423) {
          setError(data.error?.message || "This account is temporarily locked. Try again later.");
        } else {
          setError(data.error?.message || "Invalid email or password. Please try again.");
        }
        setIsLoggingIn(false);
        return;
      }

      if (data.data?.bindingToken) {
        setBindingToken(data.data.bindingToken);
      }
      const user = data.data?.user;
      if (user) {
        setAuthCookie(toCookieRole(user?.role, portal), user.name || user.fullName || "", user.email || normalized);
      }
      go(destinationFor(portal, user?.role));
    } catch (err) {
      console.error("login threw:", err);
      setError("Something went wrong. Please try again.");
      setIsLoggingIn(false);
    }
  };

  // ---------- Registration (email + password, then OTP code) ----------
  const registerEndpoint = (step: "otp" | "verify") =>
    portal === "student"
      ? `${API_BASE}/auth/register/student/${step}`
      : `${API_BASE}/auth/register/candidate/${step}`;

  const sendCode = async () => {
    setError("");
    setNotice("");
    if (!regEmail || !regEmail.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!regPassword) {
      setError("Create a password for your account.");
      return;
    }
    if (regPassword !== regConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setIsSending(true);
    try {
      const normalized = regEmail.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      const res = await fetch(registerEndpoint("otp"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalized,
          username: normalized.split("@")[0],
          password: regPassword,
          confirmPassword: regConfirm,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.error?.message?.includes("already") || data.error?.message?.includes("exists")) {
          setError("This email is already registered. Please sign in instead.");
          setMode("login");
          setEmail(normalized);
        } else {
          setError(data.error?.message || "Could not send the verification code. Please try again.");
        }
        setIsSending(false);
        return;
      }

      setNotice("Registration code sent to your email.");
      setRegStage("code");
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
      const normalized = regEmail.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      const res = await fetch(registerEndpoint("verify"), {
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
          password: regPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error?.message || "Invalid or expired code. Please try again.");
        setIsVerifying(false);
        return;
      }

      if (data.data?.bindingToken) {
        setBindingToken(data.data.bindingToken);
      }
      const user = data.data?.user;
      if (user) {
        setAuthCookie(toCookieRole(user?.role, portal), user.name || user.fullName || normalized.split("@")[0], user.email || normalized);
      }
      go(destinationFor(portal, user?.role));
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
      const normalized = regEmail.trim().toLowerCase();
      const csrfToken = await fetchCsrfToken();

      await fetch(registerEndpoint("otp"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          email: normalized,
          username: normalized.split("@")[0],
          password: regPassword,
          confirmPassword: regPassword,
        }),
      });
      setNotice("A new code has been sent.");
    } catch (err) {
      console.error("Resend failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const roleOptions: { id: Portal; label: string; hint: string; icon: React.FC<{ className?: string }> }[] = [
    { id: "student", label: "Student", hint: "Vote in elections", icon: GraduationCap },
    { id: "candidate", label: "Candidate", hint: "Run in elections", icon: Mic },
  ];

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-5">
          <AuthHeader
            title="Welcome"
            subtitle={
              portal === "candidate"
                ? "Sign in or create your candidate account"
                : "Sign in or create your student account"
            }
          />
        </div>

        {/* Role toggle — Student / Candidate only. Hidden on the dedicated
            /student/login and /candidate/login pages, which show a fixed badge. */}
        {lockPortal ? (
          <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-bg-tertiary border border-border mb-4 text-sm font-semibold text-primary-700">
            {(() => {
              const r = roleOptions.find((o) => o.id === portal) ?? roleOptions[0];
              const Icon = r.icon;
              return (
                <>
                  <Icon className="w-4 h-4" />
                  <span>{r.label} Portal</span>
                </>
              );
            })()}
          </div>
        ) : (
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-bg-tertiary border border-border mb-4" role="radiogroup" aria-label="I am a">
          {roleOptions.map((r) => {
            const Icon = r.icon;
            const active = portal === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => switchPortal(r.id)}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                  active
                    ? "bg-white text-primary-700 shadow-sm border border-primary-200"
                    : "text-text-secondary hover:text-text-primary border border-transparent"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
        )}

        {/* Mode tabs — Sign in / Register */}
        <div className="grid grid-cols-2 gap-2 mb-5" role="tablist" aria-label="Sign in or register">
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => switchMode(m)}
              className={cn(
                "py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer border-b-2",
                mode === m
                  ? "text-primary-700 border-primary-600"
                  : "text-text-muted border-transparent hover:text-text-primary"
              )}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
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

        {CLERK_ENABLED && (
          <>
            <GoogleSignInButton role={portal} />
            <div className="flex items-center gap-3 text-xs text-text-muted my-4">
              <span className="flex-1 border-t border-border" />
              or continue with email
              <span className="flex-1 border-t border-border" />
            </div>
          </>
        )}

        {mode === "login" ? (
          <div className="space-y-4">
            <Input
              id="auth-email"
              label="Email address"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              id="auth-password"
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") login();
              }}
            />
            <Button onClick={login} disabled={isLoggingIn} isLoading={isLoggingIn} className="w-full">
              {!isLoggingIn && (
                <>
                  <KeyRound className="w-4 h-4" />
                  Sign in{portal === "candidate" ? " as Candidate" : ""}
                </>
              )}
            </Button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-text-secondary pt-1">
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                New here? Create your {portal} account
              </button>
              <a href="/email-recovery" className="hover:text-primary-600 transition-colors">
                Can&apos;t access your registered email?
              </a>
            </div>
          </div>
        ) : regStage === "email" ? (
          <div className="space-y-4">
            <Input
              id="auth-reg-email"
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <Input
              id="auth-reg-password"
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Create a password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <Input
              id="auth-reg-confirm"
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={regConfirm}
              onChange={(e) => setRegConfirm(e.target.value)}
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
                onClick={() => switchMode("login")}
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
                We sent a one-time code to <strong>{regEmail}</strong>. Enter it below to finish your {portal} registration.
              </span>
            </div>
            <Input
              id="auth-reg-code"
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
                  setRegStage("email");
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

        <div className="mt-6 pt-4 border-t border-border text-xs text-text-secondary text-center leading-relaxed px-1">
          Your dashboard is chosen by your account role automatically
          {portal === "candidate" && " — new candidates wait for approval before their dashboard unlocks"}.
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
