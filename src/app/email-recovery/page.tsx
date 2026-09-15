"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, MailQuestion, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

/**
 * "Can't access your registered email?" — public recovery request form.
 *
 * Submits a login-email change request for admin review. The new email does
 * NOT get access until an election administrator verifies the student's
 * identity (name + student ID / roll number) and approves the change.
 */
export default function EmailRecoveryPage() {
  const [form, setForm] = useState({
    name: "",
    oldEmail: "",
    studentRef: "",
    newEmail: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.oldEmail.trim() || !form.studentRef.trim() || !form.newEmail.trim()) {
      setError("All fields except the reason are required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/email-recovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          oldEmail: form.oldEmail,
          studentRef: form.studentRef,
          newEmail: form.newEmail,
          reason: form.reason,
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
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Request submitted</h2>
            <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
              If your registered email belongs to an authorized student, the election
              administrator will review your request. You&apos;ll be able to sign in with your
              new email only <strong>after approval</strong> — check with your election
              administrator on the status.
            </p>
            <Link
              href="/student/login"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              Back to login
            </Link>
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
            Submit a request to change your login email. The election administrator will
            verify your identity before the new email gets access.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="As written on your student record"
              maxLength={120}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registered email</label>
            <input
              type="email"
              value={form.oldEmail}
              onChange={set("oldEmail")}
              placeholder="The email on the authorized student list"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID / Roll number</label>
            <input
              type="text"
              value={form.studentRef}
              onChange={set("studentRef")}
              placeholder="For identity verification"
              maxLength={64}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New email address</label>
            <input
              type="email"
              value={form.newEmail}
              onChange={set("newEmail")}
              placeholder="An inbox you can currently access"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={form.reason}
              onChange={set("reason")}
              placeholder="e.g. Graduated and lost access to the institute email"
              rows={3}
              maxLength={2000}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
            verifies your identity (name + student ID) before the change is applied.
          </p>
        </form>

        <div className="pt-4 border-t border-gray-200 mt-6 text-center">
          <Link href="/student/login" className="text-xs text-gray-500 hover:text-primary-600">
            ← Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
