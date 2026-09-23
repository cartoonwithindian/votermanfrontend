"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Scale, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { listCandidates } from "@/lib/candidates-api";
import { studentApi } from "@/lib/api/students";
import type { Candidate } from "@/lib/candidate-data";
import {
  getBatchesForCourse,
  type Course,
  type Section,
  type Year,
} from "@/lib/class-data";

import { CandidateGrid } from "@/components/candidate/CandidateGrid";
import { CandidateCount } from "@/components/candidate/CandidateCount";
import { MyCandidacyEditor } from "@/components/candidate/MyCandidacyEditor";
import { EmptyState } from "@/components/ui/EmptyState";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";

export default function CandidatePage() {
  const router = useRouter();

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected class — defaults to the student's own course/year/section.
  const [selectedClass, setSelectedClass] = useState({
    department: "",
    year: "" as Year | "",
    section: "" as Section,
  });

  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pre-select the logged-in student's own class when available.
  useEffect(() => {
    let cancelled = false;
    studentApi
      .getProfile()
      .then((profile) => {
        if (
          !cancelled &&
          profile?.department &&
          profile.year &&
          profile.department in { MBA: 1, MCA: 1, BBA: 1, BCom: 1, BCA: 1, TEST: 1 }
        ) {
          setSelectedClass({
            department: profile.department,
            year: profile.year as Year,
            section: (profile.section || "") as Section,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const classYears: Year[] =
    selectedClass.department === ""
      ? []
      : Array.from(
          new Set(
            getBatchesForCourse(selectedClass.department as Course).map((b) => b.year)
          )
        );

  // Load candidates for the selected class from the API
  const loadCandidates = useCallback(async (cls: typeof selectedClass) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCandidates({
        department: cls.department || undefined,
        year: cls.year || undefined,
        section: cls.section || undefined,
      });
      setCandidates(data);
    } catch (err) {
      console.error("Failed to load candidates:", err);
      setError("Failed to load candidates. Please try again.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await listCandidates({
        department: selectedClass.department || undefined,
        year: selectedClass.year || undefined,
        section: selectedClass.section || undefined,
      });
      if (cancelled) return;
      setCandidates(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClass]);

  // Event-handler retry (loading flag is set here, not inside the effect).
  const retry = () => {
    setLoading(true);
    setError(null);
    loadCandidates(selectedClass);
  };

  const toggleCompare = (id: string) => {
    setComparedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 3) next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearCompare = () => setComparedIds(new Set());
  const clearSelect = () => setSelectedIds(new Set());

  // Split the class's candidates into the Boys and Girls CR seats.
  const { boys, girls } = useMemo(() => {
    const b: Candidate[] = [];
    const g: Candidate[] = [];
    for (const c of candidates) {
      const seat = (c.position || "").toLowerCase();
      if (seat.includes("girl") || c.gender === "Female") g.push(c);
      else b.push(c);
    }
    return { boys: b, girls: g };
  }, [candidates]);

  const hasClass = Boolean(selectedClass.department && selectedClass.year);
  const totalCount = candidates.length;

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-6">
          <ErrorState
            title="Something went wrong"
            message={error}
            onRetry={retry}
          />
        </div>
      )}
        <div className="py-6 border-b border-border shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Candidates</h1>
              <p className="text-sm text-text-secondary">
                Review candidate profiles and manifestos before making your decision.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 rounded-xl bg-primary-50 text-xs sm:text-sm">
              <span className="text-primary-600 font-medium">Student Council Election 2026</span>
              <span className="text-text-secondary">Voting Open</span>
            </div>
          </div>

          {/* Class picker — pick department + year + section to view that class's CR seats */}
          <div className="grid gap-3 sm:grid-cols-3 mt-5 max-w-3xl">
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Department
              </label>
              <select
                value={selectedClass.department}
                onChange={(e) =>
                  setSelectedClass({
                    department: e.target.value,
                    year: "",
                    section: "",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select department</option>
                {["MBA", "MCA", "BBA", "BCom", "BCA", "TEST"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Year
              </label>
              <select
                value={selectedClass.year}
                disabled={!selectedClass.department}
                onChange={(e) =>
                  setSelectedClass((s) => ({ ...s, year: e.target.value as Year }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select year</option>
                {classYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                Section
              </label>
              <select
                value={selectedClass.section}
                disabled={!selectedClass.department}
                onChange={(e) =>
                  setSelectedClass((s) => ({ ...s, section: e.target.value as Section }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select section</option>
                {(() => {
                  const secs = selectedClass.department
                    ? Array.from(
                        new Set(
                          getBatchesForCourse(selectedClass.department as Course).map(
                            (b) => b.section
                          )
                        )
                      )
                    : [];
                  return secs.map((s) => (
                    <option key={s || "__none"} value={s}>
                      {s || "No section"}
                    </option>
                  ));
                })()}
              </select>
            </div>
          </div>
        </div>
      </div>

      {comparedIds.size > 0 && (
        <div className="bg-primary-50 border-b border-primary-100 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">
                {comparedIds.size} candidate{comparedIds.size !== 1 ? "s" : ""} added to comparison
              </span>
              <Badge variant="info" className="text-[10px]">Max 3</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/student/candidates/compare?ids=${Array.from(comparedIds).join(",")}`}>
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Compare
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={clearCompare}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="bg-success-50 border-b border-success-100 px-4 sm:px-6 lg:px-8 py-3">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success-600" />
              <span className="text-sm font-medium text-success-700">
                {selectedIds.size} candidate{selectedIds.size !== 1 ? "s" : ""} selected for voting
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={() => router.push("/student/vote")}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Continue to Vote
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelect}>
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <MyCandidacyEditor onUpdated={() => loadCandidates(selectedClass)} />

          {!hasClass ? (
            <EmptyState
              title="Select a Class"
              description="Choose your department, year, and section above to see the Boys and Girls Class Representatives for that class."
            />
          ) : totalCount === 0 ? (
            <EmptyState
              title="No Candidates"
              description={`No candidates are placed for ${selectedClass.department} ${selectedClass.year}${
                selectedClass.section ? ` Section ${selectedClass.section}` : ""
              } yet.`}
            />
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-text-primary text-lg">
                    Boys — Class Representative
                  </h2>
                  <CandidateCount count={boys.length} />
                </div>
                {boys.length > 0 ? (
                  <CandidateGrid
                    candidates={boys}
                    onCompare={toggleCompare}
                    comparedIds={comparedIds}
                    onSelect={toggleSelect}
                    selectedIds={selectedIds}
                  />
                ) : (
                  <p className="text-sm text-gray-400">No candidates</p>
                )}
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-text-primary text-lg">
                    Girls — Class Representative
                  </h2>
                  <CandidateCount count={girls.length} />
                </div>
                {girls.length > 0 ? (
                  <CandidateGrid
                    candidates={girls}
                    onCompare={toggleCompare}
                    comparedIds={comparedIds}
                    onSelect={toggleSelect}
                    selectedIds={selectedIds}
                  />
                ) : (
                  <p className="text-sm text-gray-400">No candidates</p>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </StudentLayout>
  );
}