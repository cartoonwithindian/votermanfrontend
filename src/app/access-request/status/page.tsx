"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Search, Clock, CheckCircle2, XCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

/**
 * Check Request Status — public page (spec §9).
 * Requires BOTH student ID and accessible email, so requests can't be probed
 * by strangers who know only one value.
 */
export default function AccessRequestStatusPage() {
  const [studentId, setStudentId] = useState("");
  const [accessibleEmail, setAccessibleEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    status: string;
    message: string;
    rejectionReason?: string;
    fullName: string;
  } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const qs = new URLSearchParams({ studentId, accessibleEmail });
      const res = await fetch(`${API_BASE}/access-requests/status?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error?.message || "Could not check the request status.");
      } else {
        setResult({
          status: data.data.status,
          message: data.data.message,
          rejectionReason: data.data.rejectionReason,
          fullName: data.data.fullName,
        });
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    }
    setLoading(false);
  };

  const inputCls =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <Search className="w-10 h-10 text-primary-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900">Check Request Status</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your Student ID and the accessible email you used in the request.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
            <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} required maxLength={64} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Accessible email</label>
            <input type="email" value={accessibleEmail} onChange={(e) => setAccessibleEmail(e.target.value)} required className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check status"}
          </button>
        </form>

        {result && (
          <div className="mt-6 border-t border-gray-200 pt-5">
            {result.status === "pending" && (
              <div className="text-center">
                <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Pending</p>
                <p className="text-sm text-gray-600">{result.message}</p>
              </div>
            )}
            {result.status === "approved" && (
              <div className="text-center">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Approved</p>
                <p className="text-sm text-gray-600 mb-4">{result.message}</p>
                <Link
                  href="/student/login"
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                >
                  Sign in now
                </Link>
              </div>
            )}
            {result.status === "rejected" && (
              <div className="text-center">
                <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Rejected</p>
                <p className="text-sm text-gray-600">{result.message}</p>
                {result.rejectionReason && (
                  <p className="mt-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    Reason: {result.rejectionReason}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t border-gray-200 mt-6 text-center">
          <Link href="/access-request" className="text-xs text-primary-600 hover:text-primary-700 hover:underline">
            Submit a new access request
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
