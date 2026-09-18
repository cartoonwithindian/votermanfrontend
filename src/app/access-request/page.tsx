"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, UserPlus, CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { CourseSelect } from "@/components/ui/CourseSelect";
import { BatchSelect } from "@/components/ui/BatchSelect";
import { getBatchesForCourse, type Course, type Section, type Year } from "@/lib/class-data";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

/**
 * Request Voting Access — public page (spec §2).
 *
 * Students identify themselves with their registered college email (old mail)
 * and give a working email to switch to (new mail). Approval is the ONLY way
 * access is granted; a pending request confers no login and no voting rights.
 */
export default function AccessRequestPage() {
  const [form, setForm] = useState({
    collegeEmail: "",
    accessibleEmail: "",
    department: "",
    yearOrSemester: "",
    section: "",
    rollNumber: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: "" }));
  };

  const handleCourseChange = (c: Course | "") => {
    setForm((prev) => ({ ...prev, department: c, yearOrSemester: "", section: "" }));
    setErrors((prev) => ({ ...prev, department: "", year: "", section: "" }));
  };

  const handleBatchChange = (batch: { section: Section; year: Year }) => {
    setForm((prev) => ({ ...prev, yearOrSemester: batch.year, section: batch.section }));
    setErrors((prev) => ({ ...prev, year: "", section: "" }));
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.collegeEmail.trim())) {
      next.collegeEmail = "Enter your registered college email";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.accessibleEmail.trim())) {
      next.accessibleEmail = "Enter a valid current email";
    }
    if (!form.department) next.department = "Course is required";
    if (!form.yearOrSemester) next.year = "Batch is required";
    const hasSectionedBatches =
      !!form.department && getBatchesForCourse(form.department as Course).some((b) => b.section);
    if (hasSectionedBatches && !form.section) next.section = "Batch is required";
    if (form.rollNumber.trim() && form.rollNumber.trim().length > 64) {
      next.rollNumber = "Roll number must be at most 64 characters";
    }
    if (!/^\+?[\d\s-]{10,15}$/.test(form.phone.trim())) {
      next.phone = "Phone number is required";
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
                href="/student/login"
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
  const errText = (k: string) =>
    errors[k] ? <p className="text-xs text-red-600 mt-1">{errors[k]}</p> : null;

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

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className={labelCls}>Registered college email *</label>
            <input type="email" value={form.collegeEmail} onChange={set("collegeEmail")} className={inputCls} placeholder="The email registered with your college" />
            <p className="text-xs text-gray-500 mt-1">
              This is how we find your class record.
            </p>
            {errText("collegeEmail")}
          </div>

          <div>
            <label className={labelCls}>Current email *</label>
            <input type="email" value={form.accessibleEmail} onChange={set("accessibleEmail")} className={inputCls} placeholder="An inbox you can open right now" />
            <p className="text-xs text-gray-500 mt-1">
              This is the email where you will receive login codes.
            </p>
            {errText("accessibleEmail")}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Course *</label>
              <CourseSelect
                id="access-course"
                value={form.department}
                onChange={handleCourseChange}
                error={!!errors.department}
              />
              {errText("department")}
            </div>
            <div>
              <label className={labelCls}>Batch *</label>
              <BatchSelect
                id="access-batch"
                course={form.department as Course}
                value={{
                  section: form.section as Section,
                  year: form.yearOrSemester as Year | "",
                }}
                onChange={handleBatchChange}
                error={!!errors.year || !!errors.section}
              />
              {errText("year") || errText("section")}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                Roll number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input type="text" value={form.rollNumber} onChange={set("rollNumber")} maxLength={64} className={inputCls} placeholder="If you don't have one yet, skip it" />
              {errText("rollNumber")}
            </div>
            <div>
              <label className={labelCls}>Phone number *</label>
              <input type="tel" value={form.phone} onChange={set("phone")} className={inputCls} placeholder="+91 98765 43210" />
              {errText("phone")}
            </div>
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
          <Link href="/student/login" className="text-xs text-gray-500 hover:text-primary-600">
            ← Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}