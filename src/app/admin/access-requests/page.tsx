"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api/client";
import {
  Search,
  Filter,
  Eye,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  RefreshCw,
} from "lucide-react";

interface AccessRequest {
  id: number;
  full_name: string | null;
  student_id: string;
  roll_number: string | null;
  department: string | null;
  year_or_semester: string | null;
  section: string | null;
  college_email: string;
  accessible_email: string;
  phone: string | null;
  request_reason: string;
  reason_detail: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_FILTERS = ["all", "pending", "approved", "rejected"] as const;

const STATUS_META: Record<string, { label: string; variant: "warning" | "success" | "error" | "neutral" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
};

const REASON_LABELS: Record<string, string> = {
  not_in_list: "Not in authorized list",
  cannot_access_email: "Cannot access registered email",
  incorrect_email: "Email address incorrect",
  other: "Other",
};

/**
 * Student Access Requests — admin management (spec §4).
 * Approve = verify + add student to authorized list + grant voting
 * eligibility (done atomically server-side). Reject = requires a reason.
 */
export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<AccessRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{ requests: AccessRequest[]; counts: Record<string, number> }>(
        "/admin/access-requests"
      );
      setRequests(res.requests || []);
      setCounts(res.counts || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load access requests.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests.filter((r) => {
      const matchesSearch =
        q === "" ||
        (r.full_name || "").toLowerCase().includes(q) ||
        (r.student_id || "").toLowerCase().includes(q) ||
        (r.roll_number || "").toLowerCase().includes(q) ||
        (r.college_email || "").toLowerCase().includes(q) ||
        (r.accessible_email || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const openDetail = (r: AccessRequest) => {
    setSelected(r);
    setRejectReason("");
    setActionError("");
  };

  const approve = async () => {
    if (!selected) return;
    setActionBusy(true);
    setActionError("");
    try {
      await api.patch(`/admin/access-requests/${selected.id}/approve`, {});
      setSelected(null);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Approval failed.");
    }
    setActionBusy(false);
  };

  const reject = async () => {
    if (!selected || !rejectReason.trim()) return;
    setActionBusy(true);
    setActionError("");
    try {
      await api.patch(`/admin/access-requests/${selected.id}/reject`, { reason: rejectReason });
      setSelected(null);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Rejection failed.");
    }
    setActionBusy(false);
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Student Access Requests</h1>
            <p className="text-sm text-text-secondary mt-1">
              Review and approve students who are not in the authorized list. Approval adds the
              student and grants voting eligibility.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-warning-500" />
            <div>
              <p className="text-xl font-bold text-text-primary">{counts.pending ?? 0}</p>
              <p className="text-xs text-text-tertiary">Pending</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-success-500" />
            <div>
              <p className="text-xl font-bold text-text-primary">{counts.approved ?? 0}</p>
              <p className="text-xs text-text-tertiary">Approved</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <XCircle className="h-5 w-5 text-error-500" />
            <div>
              <p className="text-xl font-bold text-text-primary">{counts.rejected ?? 0}</p>
              <p className="text-xs text-text-tertiary">Rejected</p>
            </div>
          </Card>
        </div>

        {error && (
          <div className="p-3 bg-error-50 border border-error-200 rounded-xl text-error-600 text-sm">
            {error}
          </div>
        )}

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Search by name, student ID, roll number, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-tertiary"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All" : STATUS_META[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="hidden md:block">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-semibold text-text-primary py-3 px-4">Request ID</th>
                    <th className="text-left font-semibold text-text-primary py-3 px-4">Student</th>
                    <th className="text-left font-semibold text-text-primary py-3 px-4">Student ID</th>
                    <th className="text-left font-semibold text-text-primary py-3 px-4">Department</th>
                    <th className="text-left font-semibold text-text-primary py-3 px-4">Accessible Email</th>
                    <th className="text-left font-semibold text-text-primary py-3 px-4">Date</th>
                    <th className="text-left font-semibold text-text-primary py-3 px-4">Status</th>
                    <th className="text-right font-semibold text-text-primary py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-primary-50/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-medium text-text-primary">SAR-{String(r.id).padStart(5, "0")}</td>
                      <td className="py-3 px-4 font-medium text-text-primary">{r.full_name || "—"}</td>
                      <td className="py-3 px-4 text-text-secondary">{r.student_id || "—"}</td>
                      <td className="py-3 px-4 text-text-secondary">{r.department || "—"}</td>
                      <td className="py-3 px-4 text-text-secondary">{r.accessible_email}</td>
                      <td className="py-3 px-4 text-text-secondary whitespace-nowrap">{fmtDate(r.created_at)}</td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_META[r.status].variant}>{STATUS_META[r.status].label}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <UserPlus className="h-12 w-12 text-text-tertiary mb-3" />
              <p className="text-text-secondary font-medium">No access requests</p>
              <p className="text-sm text-text-tertiary mt-1">
                Student access requests will appear here for review.
              </p>
            </div>
          )}
        </Card>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {filtered.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-xs font-medium text-text-primary">SAR-{String(r.id).padStart(5, "0")}</span>
                <Badge variant={STATUS_META[r.status].variant}>{STATUS_META[r.status].label}</Badge>
              </div>
              <p className="text-sm text-text-primary font-medium mb-1">{r.full_name || (r.college_email || r.accessible_email)}</p>
              <p className="text-xs text-text-tertiary mb-2">
                {r.student_id || "—"} • {r.department || "—"}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-secondary">{r.accessible_email}</p>
                <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative ml-auto w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-text-primary">
                    SAR-{String(selected.id).padStart(5, "0")}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">Submitted {fmtDate(selected.created_at)}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer">
                  <X className="h-5 w-5 text-text-secondary" />
                </button>
              </div>

              {/* Student details */}
              <Card>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Student details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-text-tertiary text-xs">Full name</p><p className="font-medium text-text-primary">{selected.full_name || "—"}</p></div>
                  <div><p className="text-text-tertiary text-xs">Student ID</p><p className="font-medium text-text-primary">{selected.student_id || "—"}</p></div>
                  <div><p className="text-text-tertiary text-xs">Roll number</p><p className="text-text-primary">{selected.roll_number || "—"}</p></div>
                  <div><p className="text-text-tertiary text-xs">Phone</p><p className="text-text-primary">{selected.phone || "—"}</p></div>
                  <div><p className="text-text-tertiary text-xs">Year / Semester</p><p className="text-text-primary">{selected.year_or_semester || "—"}</p></div>
                  <div><p className="text-text-tertiary text-xs">Section</p><p className="text-text-primary">{selected.section || "—"}</p></div>
                  <div className="col-span-2"><p className="text-text-tertiary text-xs">Department</p><p className="text-text-primary">{selected.department || "—"}</p></div>
                  <div><p className="text-text-tertiary text-xs">College email</p><p className="text-text-primary break-all">{selected.college_email || "—"}</p></div>
                  <div><p className="text-text-tertiary text-xs">Accessible email</p><p className="text-text-primary break-all">{selected.accessible_email}</p></div>
                  <div><p className="text-text-tertiary text-xs">Matched whitelist</p><p className="text-text-primary break-all">{selected.full_name ? "✅ Auto-matched" : "No whitelist match"}</p></div>
                </div>
              </Card>

              {/* Reason */}
              {selected.request_reason !== "other" || selected.reason_detail ? (
                <Card>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Reason</p>
                  <p className="text-sm text-text-primary mb-1">{REASON_LABELS[selected.request_reason] || selected.request_reason}</p>
                  {selected.reason_detail && (
                    <p className="text-sm text-text-secondary leading-relaxed">{selected.reason_detail}</p>
                  )}
                </Card>
              ) : null}

              {/* Status / review info */}
              {selected.status !== "pending" && (
                <Card>
                  <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Review</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={STATUS_META[selected.status].variant}>{STATUS_META[selected.status].label}</Badge>
                    <span className="text-xs text-text-tertiary">{fmtDate(selected.reviewed_at)}</span>
                  </div>
                  {selected.reviewed_by_name && (
                    <p className="text-xs text-text-tertiary">by {selected.reviewed_by_name}</p>
                  )}
                  {selected.status === "rejected" && selected.rejection_reason && (
                    <p className="text-sm text-text-primary mt-2">Reason: {selected.rejection_reason}</p>
                  )}
                </Card>
              )}

              {actionError && (
                <div className="p-3 bg-error-50 border border-error-200 rounded-xl text-error-600 text-sm">
                  {actionError}
                </div>
              )}

              {/* Actions for pending */}
              {selected.status === "pending" && (
                <>
                  <Card>
                    <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">
                      Reject — reason required
                    </p>
                    <textarea
                      placeholder="Explain why this request is rejected..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-text-tertiary resize-none"
                    />
                  </Card>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={reject} disabled={actionBusy || !rejectReason.trim()}>
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button variant="primary" size="sm" className="flex-1" onClick={approve} disabled={actionBusy}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve &amp; authorize
                    </Button>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Approving verifies this student, adds them to the authorized list, and (when the
                    registered college email matches) switches their login to{" "}
                    <strong>{selected.accessible_email}</strong>.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
