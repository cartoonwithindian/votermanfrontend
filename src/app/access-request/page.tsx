"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { CourseSelect } from "@/components/ui/CourseSelect";
import { BatchSelect } from "@/components/ui/BatchSelect";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const REASONS = [
  { value: "not_in_list", label: "My email is not in the authorized student list." },
  { value: "cannot_access_email", label: "I cannot access my registered email." },
  { value: "incorrect_email", label: "My email address is incorrect." },
  { value: "other", label: "Other." },
];

/**
 * Request Voting Access — public page (spec §2).
 *
 * For students who are not on the authorized list or cannot sign in.
 * Approval by an administrator is the ONLY way access is granted; a pending
 * request confers no login and no voting rights.
 */
export default function AccessRequestPage() {
  const [form, setForm] = useState({
    fullName: "",
    studentId: "",
    rollNumber: "",
    department: "",
    yearOrSemester: "",
    collegeEmail: "",
    accessibleEmail: "",
    reason: "not_in_list",
    reasonDetail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/access-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  if (submitted) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Request submitted</h2>
            <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">
              Your request has been submitted successfully. Please wait for administrator approval.
            </p>
            <p className="text-xs text-gray-500 mb-6 max-w-sm mx-auto">
              Your request will be reviewed by the administrator. You will be able to vote only
              after your request is approved.
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Link
                href="/access-request/status"
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline"
              >
                Check your request status →
              </Link>
              <Link
                href="/login"
                className="text-xs text-gray-500 hover:text-primary-600"
              >
                ← Back to sign in
              </Link>
            </div>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <UserPlus className="w-10 h-10 text-primary-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Request Voting Access</h1>
          <p className="text-sm text-gray-500 mt-2">
            For students who are not in the authorized list or cannot sign in. An
            administrator reviews every request — access is never automatic.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelCls}>Full name *</label>
            <input type="text" value={form.fullName} onChange={set("fullName")} required maxLength={255} className={inputCls} placeholder="As per college records" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Student ID *</label>
              <input type="text" value={form.studentId} onChange={set("studentId")} required maxLength={64} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Roll number</label>
              <input type="text" value={form.rollNumber} onChange={set("rollNumber")} maxLength={64} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Course</label>
              <CourseSelect
                id="access-course"
                value={form.department}
                onChange={(c) =>
                  setForm((f) => ({ ...f, department: c, yearOrSemester: "" }))
                }
              />
            </div>
            <div>
              <label className={labelCls}>Batch</label>
              <BatchSelect
                id="access-batch"
                course={form.department as "MBA" | "MCA" | "BBA" | "BCom" | "BCA"}
                value={{
                  section: "" as "A1" | "A2" | "A3" | "",
                  year: form.yearOrSemester as "1st Year" | "2nd Year" | "3rd Year" | "",
                }}
                onChange={(b) => setForm((f) => ({ ...f, yearOrSemester: b.year }))}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Registered college email *</label>
            <input type="email" value={form.collegeEmail} onChange={set("collegeEmail")} required className={inputCls} placeholder="The email on your college record" />
          </div>

          <div>
            <label className={labelCls}>Current accessible email *</label>
            <input type="email" value={form.accessibleEmail} onChange={set("accessibleEmail")} required className={inputCls} placeholder="An inbox you can open right now" />
          </div>

          <div>
            <label className={labelCls}>Reason for request *</label>
            <select value={form.reason} onChange={set("reason")} className={inputCls}>
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>
              Details <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea value={form.reasonDetail} onChange={set("reasonDetail")} rows={3} maxLength={2000} className={`${inputCls} resize-none`} placeholder="Anything that helps the administrator verify you" />
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
              "Submit access request"
            )}
          </button>

          <p className="text-xs text-center text-gray-500">
            Your request will be reviewed by the administrator. You will be able to vote
            only after your request is approved.
          </p>
        </form>

        <div className="pt-4 border-t border-gray-200 mt-6 text-center">
          <Link href="/access-request/status" className="text-xs text-primary-600 hover:text-primary-700 hover:underline">
            Check request status
          </Link>
          <span className="text-gray-300 mx-2">|</span>
          <Link href="/login" className="text-xs text-gray-500 hover:text-primary-600">
            ← Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
