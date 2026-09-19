"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, MailQuestion, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "");

/**
 * "Can't access your registered email?" — public recovery request form.
 *
 * Submits through the admin access-request pipeline
 * (POST /api/v1/access-requests), so the request lands directly in the
 * admin portal at /admin/access-requests. The student is matched by their
 * registered college email + full name (the backend resolves the whitelist
 * row); the phone number is recorded for admin identity verification. The
 * new email does NOT get access until an election administrator approves.
 */
export default function EmailRecoveryPage() {
  const [form, setForm] = useState({
    name: "",
    oldEmail: "",
    phone: "",
    newEmail: "",
    reason: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: "" }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.oldEmail.trim())) {
      next.oldEmail = "Enter the email registered with your college.";
    }
    if (!/^\+?[\d\s-]{10,15}$/.test(form.phone.trim())) {
      next.phone = "Enter a valid phone number (10-15 digits).";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.newEmail.trim())) {
      next.newEmail = "Enter the new email you can access.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setErrors({});
    if (!validate()) return;
    setLoading(true);
    try {
      // Access-request pipeline: full name + registered college email find
      // the student on the backend; the new email + phone + reason are
      // stored for admin review. Lands in /admin/access-requests.
      const res = await fetch(`${API_BASE}/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.name,
          collegeEmail: form.oldEmail.trim().toLowerCase(),
          phone: form.phone.replace(/[\s()-]/g, ""),
          accessibleEmail: form.newEmail.trim().toLowerCase(),
          reason: "cannot_access_email",
          reasonDetail: form.reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message || "Could not submit your request. Please try again.");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";
  const errText = (k: string) =>
    errors[k] ? <p className="text-xs text-red-600 mt-1">{errors[k]}</p> : null;

  if (submitted) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Request submitted</h2>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
              The election administrator has received your request. If the registered email
              belongs to an authorized student, they&apos;ll verify your identity and you&apos;ll be
              able to sign in with your new email only <strong>after approval</strong>.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Link
                href="/access-request/status"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                Check your request status →
              </Link>
              <Link
                href="/student/login"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              >
                Back to login
              </Link>
            </div>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <MailQuestion className="w-10 h-10 text-primary-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Can&apos;t access your registered email?</h1>
          <p className="text-sm text-gray-500 mt-2">
            Submit a request with the details below. The administrator will find your record,
            verify your identity, and approve the new email before it gets access.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className={labelCls}>Full name *</label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="As written on your student record"
              maxLength={120}
              className={inputCls}
            />
            {errText("name")}
          </div>

          <div>
            <label className={labelCls}>Registered email *</label>
            <input
              type="email"
              value={form.oldEmail}
              onChange={set("oldEmail")}
              placeholder="The email registered with your college"
              className={inputCls}
            />
            <p className="text-xs text-gray-500 mt-1">
              This is how we find your student record.
            </p>
            {errText("oldEmail")}
          </div>

          <div>
            <label className={labelCls}>Phone number *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={set("phone")}
              placeholder="+91 98765 43210"
              className={inputCls}
            />
            <p className="text-xs text-gray-500 mt-1">
              Used by the administrator to verify your identity.
            </p>
            {errText("phone")}
          </div>

          <div>
            <label className={labelCls}>New email address *</label>
            <input
              type="email"
              value={form.newEmail}
              onChange={set("newEmail")}
              placeholder="An inbox you can currently access"
              className={inputCls}
            />
            <p className="text-xs text-gray-500 mt-1">
              This is the email you will sign in with after approval.
            </p>
            {errText("newEmail")}
          </div>

          <div>
            <label className={labelCls}>
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.reason}
              onChange={set("reason")}
              placeholder="e.g. Graduated and lost access to the institute email"
              rows={3}
              maxLength={2000}
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit recovery request"
            )}
          </button>

          <p className="text-xs text-center text-gray-500">
            The new email does <strong>not</strong> receive access automatically. An admin
            verifies your identity before the change is applied.
          </p>
        </form>

        <div className="pt-4 border-t border-gray-200 mt-6 text-center">
          <Link href="/access-request/status" className="text-xs text-primary-600 hover:text-primary-700 hover:underline">
            Check request status
          </Link>
          <span className="text-gray-300 mx-2">|</span>
          <Link href="/student/login" className="text-xs text-gray-500 hover:text-primary-600">
            ← Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}