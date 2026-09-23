"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Scale, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { listCandidates } from "@/lib/candidates-api";
import { studentApi } from "@/lib/api/students";
import { normalizeCourse, normalizeYear } from "@/lib/class-data";
import type { Candidate } from "@/lib/candidate-data";

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

  // The logged-in student's own class — students only ever see their own
  // cohort's candidates here (the backend enforces this too).
  const [ownClass, setOwnClass] = useState<{
    department: string;
    year: string;
    section: string;
  } | null>(null);

  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    studentApi
      .getProfile()
      .then((profile) => {
        if (cancelled) return;
        if (profile?.department && profile.year) {
          setOwnClass({
            department: normalizeCourse(profile.department) || profile.department,
            year: normalizeYear(profile.year),
            section: profile.section || "",
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCandidates();
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
      try {
        const data = await listCandidates();
        if (cancelled) return;
        setCandidates(data);
      } catch (err) {
        console.error("Failed to load candidates:", err);
        if (cancelled) return;
        setError("Failed to load candidates. Please try again.");
        setCandidates([]);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const retry = () => {
    loadCandidates();
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

  const totalCount = candidates.length;
  const classLabel = ownClass
    ? `${ownClass.department} ${ownClass.year}${ownClass.section ? ` Section ${ownClass.section}` : ""}`
    : "";

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

          {ownClass && (
            <div className="mt-5 max-w-3xl">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Your Class
                </span>
                <span className="font-medium text-text-primary">{classLabel}</span>
              </div>
            </div>
          )}
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
          <MyCandidacyEditor onUpdated={() => loadCandidates()} />

          {!ownClass ? (
            <EmptyState
              title="No Class on File"
              description="Your account is not linked to a department, year, and section yet. Contact the administration to be assigned a class."
            />
          ) : totalCount === 0 ? (
            <EmptyState
              title="No Candidates"
              description={`No candidates are placed for ${classLabel} yet.`}
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