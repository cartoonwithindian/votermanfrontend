"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { adminApi } from "@/lib/api/admin";
import { api } from "@/lib/api/client";
import {
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Inbox,
  RefreshCw,
} from "lucide-react";

interface ElectionInfo {
  id: number;
  name: string;
  status: string;
}

interface PendingVoter {
  studentId: number;
  student_id: string | null;
  name: string;
  roll_number: string | null;
}

interface TurnoutClass {
  department: string;
  year: string;
  section: string;
  total_authorized: number;
  voted: number;
  pending: number;
  participation_pct: number;
  pending_voters: PendingVoter[];
}

interface TurnoutData {
  election: ElectionInfo;
  totals: {
    total_authorized: number;
    total_voted: number;
    total_pending: number;
    participation_pct: number;
  };
  classes: TurnoutClass[];
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "neutral" | "info"> = {
  OPEN: "success",
  DRAFT: "warning",
  CLOSED: "neutral",
  PUBLISHED: "info",
};

function className(c: { department: string; year: string; section: string }): string {
  const parts = [c.department, c.year, c.section].filter((p) => p && p !== "-");
  return parts.join(" ") || "Unassigned";
}

function pendingPctBadge(pct: number): { variant: "success" | "warning" | "error"; label: string } {
  if (pct >= 50) return { variant: "success", label: `${pct}% pending` };
  if (pct >= 25) return { variant: "warning", label: `${pct}% pending` };
  return { variant: "error", label: `${pct}% pending` };
}

export default function AdminVoterTurnoutPage() {
  const [elections, setElections] = useState<ElectionInfo[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [turnout, setTurnout] = useState<TurnoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTurnout, setLoadingTurnout] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadElections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = (await adminApi.getElections()) as any;
      const list: ElectionInfo[] = (Array.isArray(res) ? res : res?.elections || res?.data || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        status: e.status,
      }));
      setElections(list);
      setLoading(false);
    } catch {
      setError("Could not load elections.");
      setLoading(false);
    }
  }, []);

  const loadTurnout = useCallback(async (id: number) => {
    setLoadingTurnout(true);
    setError("");
    try {
      const data = await api.get<TurnoutData>(`/admin/elections/${id}/turnout`);
      setTurnout(data);
      setExpanded({});
      setLoadingTurnout(false);
    } catch {
      setError("Could not load voter turnout for this election.");
      setTurnout(null);
      setLoadingTurnout(false);
    }
  }, []);

  useEffect(() => {
    loadElections();
  }, [loadElections]);

  useEffect(() => {
    if (selectedId) loadTurnout(Number(selectedId));
  }, [selectedId, loadTurnout]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Voter Turnout</h1>
          <p className="text-sm font-semibold text-text-secondary mt-1">
            Track which class has voted and which students have not voted yet.
          </p>
        </div>
        <Card className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
            <label className="text-sm font-medium text-text-primary whitespace-nowrap">Election</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : "")}
              className="w-full sm:w-[320px] px-3 py-2 rounded-xl border border-border bg-bg-tertiary text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">Select an election…</option>
              {elections.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.status})
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadElections()} disabled={loading} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </Card>

        {error && (
          <Card className="flex items-start gap-3 border-error-200 bg-error-50">
            <AlertTriangle className="w-5 h-5 text-error-600 mt-0.5" />
            <p className="text-sm text-error-700">{error}</p>
          </Card>
        )}

        {loading && <Card className="p-10 text-center text-sm text-text-secondary">Loading elections…</Card>}

        {!loading && !error && elections.length === 0 && (
          <Card className="p-10 text-center flex flex-col items-center gap-3">
            <Inbox className="h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-secondary">No elections yet. Create an election first.</p>
          </Card>
        )}

        {selectedId && loadingTurnout && (
          <Card className="p-10 text-center text-sm text-text-secondary">Loading voter turnout…</Card>
        )}

        {selectedId && !loadingTurnout && turnout && (
          <>
            <Card className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary-50">
                  <Users className="h-5 w-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-text-primary">
                    {turnout.totals.total_authorized.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-secondary">Authorized</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success-50">
                  <CheckCircle2 className="h-5 w-5 text-success-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-text-primary">
                    {turnout.totals.total_voted.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-secondary">Voted</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-warning-50">
                  <Clock className="h-5 w-5 text-warning-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-text-primary">
                    {turnout.totals.total_pending.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-secondary">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-100">
                  <Users className="h-5 w-5 text-neutral-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-text-primary">
                    {turnout.totals.participation_pct}%
                  </p>
                  <p className="text-xs text-text-secondary">Turnout</p>
                </div>
              </div>
            </Card>

            {turnout.totals.total_pending > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning-600" />
                <p className="text-sm text-text-secondary">
                  {turnout.totals.total_pending.toLocaleString()} students have not voted yet.
                </p>
              </div>
            )}

            {turnout.classes.length === 0 ? (
              <Card className="p-10 text-center flex flex-col items-center gap-3">
                <Inbox className="h-10 w-10 text-text-muted" />
                <p className="text-sm text-text-secondary">No authorized voters in this election yet.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {turnout.classes.map((c) => {
                  const key = `${c.department}|${c.year}|${c.section}`;
                  const isOpen = expanded[key];
                  const pendingInfo = pendingPctBadge(c.pending > 0 ? Math.round((c.pending / c.total_authorized) * 100) : 0);
                  return (
                    <Card key={key} className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary truncate">{className(c)}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {c.pending > 0 ? (
                              <Badge variant="warning" size="sm">{c.pending} pending</Badge>
                            ) : (
                              <Badge variant="success" size="sm">All voted</Badge>
                            )}
                            <Badge variant={pendingInfo.variant} size="sm">{c.voted}/{c.total_authorized} voted</Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-text-primary leading-tight">{c.participation_pct}%</p>
                          <p className="text-[10px] text-text-secondary">turnout</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm pt-2 border-t border-border">
                        <span className="text-text-secondary">
                          <span className="font-semibold text-success-600">{c.voted}</span> voted
                        </span>
                        <span className="text-text-secondary">
                          <span className="font-semibold text-warning-600">{c.pending}</span> pending
                        </span>
                      </div>

                      {c.pending > 0 && (
                        <button
                          onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {isOpen ? "Hide" : "Show"} pending voters
                        </button>
                      )}

                      {isOpen && (
                        <div className="max-h-64 overflow-y-auto rounded-xl bg-bg-tertiary divide-y divide-border border border-border">
                          {c.pending_voters.length === 0 ? (
                            <div className="p-3 text-xs text-text-secondary">No pending voters.</div>
                          ) : (
                            c.pending_voters.map((v) => (
                              <div key={v.studentId} className="flex items-center justify-between gap-2 px-3 py-2">
                                <div className="min-w-0">
                                  <p className="text-sm text-text-primary truncate">{v.name}</p>
                                  <p className="text-xs text-text-secondary">
                                    {v.roll_number || v.student_id || v.studentId}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}