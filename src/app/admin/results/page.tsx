"use client";

import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/api/admin";
import {
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Medal,
  X,
  Send,
  ChevronDown,
  ChevronUp,
  Inbox,
} from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

interface ResultsFull {
  election_id: number;
  election_name: string;
  election_status: string;
  eligible_students: number;
  ballots_submitted: number;
  participation_rate: number;
  results_published: boolean;
  total_constituencies: number;
  constituencies: Array<{
    constituency_id: number;
    constituency_name: string;
    positions: Array<{
      position_id: number;
      position_name: string;
      candidates: Array<{
        candidate_id: number;
        candidate_name: string;
        vote_count: number;
        percentage: number;
        rank: number;
        status: string;
      }>;
      total_votes: number;
    }>;
  }>;
}

export default function AdminResultsPage() {
  const [elections, setElections] = useState<Array<{ id: number; name: string; status: string }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [results, setResults] = useState<ResultsFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPositions, setExpandedPositions] = useState<Record<string, boolean>>({});
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishConfirmText, setPublishConfirmText] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishNote, setPublishNote] = useState("");
  const [justPublished, setJustPublished] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadResults = async (id: number, opts?: { silent?: boolean }) => {
    try {
      const res = await adminApi.getElectionResults(id);
      const full = res as ResultsFull;
      setResults(full);
      setError("");
      setLastUpdated(new Date());
      if (!opts?.silent) {
        // Expand the first position of each constituency by default
        const initial: Record<string, boolean> = {};
        (full.constituencies || []).forEach((ct) =>
          (ct.positions || []).forEach((pos, i) => {
            initial[`ct:${ct.constituency_id}:${pos.position_id}`] = i === 0;
          })
        );
        setExpandedPositions(initial);
      }
    } catch (e) {
      if (!opts?.silent) {
        setResults(null);
        setError(e instanceof Error ? e.message : "Unable to load data. Please try again.");
      }
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await adminApi.getMonitorElections();
        const list = res.elections || [];
        setElections(list);
        if (list.length > 0) {
          setSelectedId(list[0].id);
          await loadResults(list[0].id);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load data. Please try again.");
      }
      setLoading(false);
    })();
  }, []);

  // Live polling: refresh the selected election's results every 5s while the
  // tab is visible without reopening already-expanded positions.
  useEffect(() => {
    if (!selectedId) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") loadResults(selectedId, { silent: true });
    }, 5000);
    return () => clearInterval(t);
  }, [selectedId]);

  const handlePublish = async () => {
    if (!selectedId || publishConfirmText !== "PUBLISH") return;
    setPublishing(true);
    try {
      await adminApi.publishElectionResults(selectedId);
      setShowPublishModal(false);
      setPublishConfirmText("");
      setJustPublished(true);
      await loadResults(selectedId);
    } catch (e) {
      setPublishNote(e instanceof Error ? e.message : "Publish failed. Please try again.");
    }
    setPublishing(false);
  };

  if (loading)
    return (
      <AdminLayout>
        <div className="p-8 text-center text-text-secondary">Loading results…</div>
      </AdminLayout>
    );

  const statusBadge = results?.results_published ? (
    <Badge variant="success">Published</Badge>
  ) : results?.election_status === "CLOSED" ? (
    <Badge variant="warning">Ready for Review</Badge>
  ) : (
    <Badge variant="info">Election Open — live counts</Badge>
  );

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Election Results</h1>
            <p className="text-sm text-text-secondary mt-1">
              Real vote counts from the database{lastUpdated ? ` — updated ${lastUpdated.toLocaleTimeString()}` : ""}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="success">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success-500 animate-live-pulse" />
                LIVE
              </span>
            </Badge>
            {statusBadge}
          </div>
        </div>

        {/* Election selector */}
        {elections.length > 0 && (
          <Card className="p-4">
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Election</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedId(id);
                setJustPublished(false);
                loadResults(id);
              }}
              className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
            >
              {elections.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.status})
                </option>
              ))}
            </select>
          </Card>
        )}

        {error && (
          <Card className="p-4 flex items-center gap-3 border-error-200 bg-error-50">
            <AlertTriangle className="w-5 h-5 text-error-500" />
            <p className="text-sm text-error-600">{error}</p>
          </Card>
        )}

        {elections.length === 0 ? (
          <Card className="p-12 text-center">
            <Inbox className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary">No Elections Yet</h3>
            <p className="text-sm text-text-secondary mt-1">
              Create an election first — results will appear here once votes are cast.
            </p>
          </Card>
        ) : results ? (
          <>
            {/* Results Overview */}
            <Card>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Results Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-primary-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-medium text-primary-600">Election Status</span>
                  </div>
                  <p className="text-lg font-bold text-primary-700">{results.election_status}</p>
                </div>
                <div className="bg-primary-50 rounded-xl p-4">
                  <span className="text-xs font-medium text-primary-600 block mb-1">Eligible Students</span>
                  <p className="text-lg font-bold text-primary-700">
                    {(results.eligible_students ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-primary-50 rounded-xl p-4">
                  <span className="text-xs font-medium text-primary-600 block mb-1">Ballots Submitted</span>
                  <p className="text-lg font-bold text-primary-700">
                    {(results.ballots_submitted ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-success-50 rounded-xl p-4">
                  <span className="text-xs font-medium text-success-600 block mb-1">Participation</span>
                  <p className="text-lg font-bold text-success-600">{results.participation_rate ?? 0}%</p>
                </div>
                <div className="bg-primary-50 rounded-xl p-4 col-span-2 sm:col-span-1">
                  <span className="text-xs font-medium text-primary-600 block mb-1">Constituencies</span>
                  <p className="text-lg font-bold text-primary-700">
                    {results.total_constituencies ?? (results.constituencies || []).length}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-bg-tertiary flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">Results Status</span>
                {statusBadge}
              </div>
            </Card>

            {justPublished && (
              <Card className="border-success-200 bg-success-50">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-success-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-success-700">Results Published</h3>
                    <p className="text-sm text-success-600 mt-1">
                      The results for this election are now visible to students.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Result Review by CR Constituency -> Position */}
            {(results.constituencies || []).length === 0 ? (
              <Card className="p-12 text-center">
                <Inbox className="h-12 w-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary">No Results Yet</h3>
                <p className="text-sm text-text-secondary mt-1">
                  No candidates or votes recorded for this election yet.
                </p>
              </Card>
            ) : (
              (() => {
                const sections =
                  (results.constituencies || []).map((ct) => ({
                    header: `CR — ${ct.constituency_name}`,
                    positions: ct.positions || [],
                    keyPrefix: `ct:${ct.constituency_id}`,
                  }));
                return sections.map((section) => (
                  <div key={section.keyPrefix} className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                      {section.header}
                    </h3>
                    {section.positions.map((position) => {
                      const key = `${section.keyPrefix}:${position.position_id}`;
                      const expanded = expandedPositions[key];
                      return (
                        <Card key={position.position_id}>
                          <button
                            onClick={() => setExpandedPositions((prev) => ({ ...prev, [key]: !prev[key] }))}
                            className="w-full flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <Trophy className="w-5 h-5 text-primary-600" />
                              <h4 className="text-base font-semibold text-text-primary">
                                {position.position_name}
                              </h4>
                            </div>
                            {expanded ? (
                              <ChevronUp className="w-5 h-5 text-text-muted" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-text-muted" />
                            )}
                          </button>

                          {expanded && (
                            <div className="mt-4">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left py-2 px-3 font-medium text-text-secondary">Candidate</th>
                                      <th className="text-right py-2 px-3 font-medium text-text-secondary">Votes</th>
                                      <th className="text-right py-2 px-3 font-medium text-text-secondary">Percentage</th>
                                      <th className="text-center py-2 px-3 font-medium text-text-secondary">Rank</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(position.candidates || []).length === 0 ? (
                                      <tr>
                                        <td colSpan={4} className="py-4 px-3 text-center text-text-secondary text-sm">
                                          No candidates for this position.
                                        </td>
                                      </tr>
                                    ) : (
                                      (position.candidates || []).map((candidate) => (
                                        <tr
                                          key={candidate.candidate_id}
                                          className={`border-b border-border/50 ${
                                            candidate.status === "winner" ? "bg-success-50/50" : ""
                                          }`}
                                        >
                                          <td className="py-3 px-3 flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                              {candidate.status === "winner" && (
                                                <Trophy className="w-4 h-4 text-warning-500" />
                                              )}
                                              {candidate.status === "runner_up" && (
                                                <Medal className="w-4 h-4 text-text-muted" />
                                              )}
                                              <span
                                                className={`font-medium ${
                                                  candidate.status === "winner"
                                                    ? "text-success-700"
                                                    : "text-text-primary"
                                                }`}
                                              >
                                                {candidate.candidate_name}
                                              </span>
                                              {candidate.status === "winner" && (
                                                <Badge variant="success" size="sm">
                                                  Winner
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="w-full bg-bg-tertiary rounded-full h-2 min-w-[8rem] sm:min-w-[12rem]">
                                              <div
                                                className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.min(100, candidate.percentage ?? 0)}%` }}
                                              />
                                            </div>
                                          </td>
                                          <td className="py-3 px-3 text-right text-text-primary font-medium">
                                            {(candidate.vote_count ?? 0).toLocaleString()}
                                          </td>
                                          <td className="py-3 px-3 text-right text-text-secondary">
                                            {candidate.percentage ?? 0}%
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                                              {candidate.rank}
                                            </span>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ));
              })()
            )}

            {/* Actions */}
            <Card>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                {results.results_published ? (
                  <Link href="/student/results">
                    <Button variant="secondary">
                      <Send className="w-4 h-4" />
                      View Public Results
                    </Button>
                  </Link>
                ) : results.election_status === "CLOSED" ? (
                  <Button onClick={() => setShowPublishModal(true)}>
                    <Send className="w-4 h-4" />
                    Publish Results
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <AlertTriangle className="w-4 h-4 text-warning-500" />
                    Results can be published after the election closes.
                  </div>
                )}
              </div>
            </Card>
          </>
        ) : null}
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-900/40 backdrop-blur-sm"
          onClick={() => setShowPublishModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-[0_20px_40px_rgba(32,39,92,0.2)] border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-text-primary">Publish Official Results?</h2>
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setPublishConfirmText("");
                }}
                className="p-1.5 rounded-xl text-text-muted hover:bg-primary-50 hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Once published, these results will become visible to all students. This action is
                recorded in the audit log.
              </p>
              {publishNote && <p className="text-sm text-error-600 mb-3">{publishNote}</p>}
              <label className="text-xs font-medium text-text-secondary block mb-1.5">
                Type <span className="font-bold text-text-primary">PUBLISH</span> to confirm
              </label>
              <input
                type="text"
                value={publishConfirmText}
                onChange={(e) => setPublishConfirmText(e.target.value)}
                placeholder="PUBLISH"
                className="w-full px-4 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPublishModal(false);
                    setPublishConfirmText("");
                  }}
                >
                  Cancel
                </Button>
                <Button disabled={publishConfirmText !== "PUBLISH" || publishing} onClick={handlePublish}>
                  <Send className="w-4 h-4" />
                  {publishing ? "Publishing…" : "Publish Results"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
