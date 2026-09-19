"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Scale, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { listCandidates } from "@/lib/candidates-api";
import { studentApi, type StudentProfile } from "@/lib/api/students";
import type { Candidate } from "@/lib/candidate-data";

import { CandidateGrid } from "@/components/candidate/CandidateGrid";
import { CandidateSearch } from "@/components/candidate/CandidateSearch";
import { CandidateFilters } from "@/components/candidate/CandidateFilters";
import { CandidateSort } from "@/components/candidate/CandidateSort";
import { CandidateCount } from "@/components/candidate/CandidateCount";
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

  // The logged-in student's own class — the candidate list is scoped to this
  // course / year / section (server-enforced), so only their cohort shows.
  const [myClass, setMyClass] = useState<Pick<StudentProfile, "department" | "year" | "section"> | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    gender: "all",
  });
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc">("name-asc");

  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load the student's own class for the cohort banner. Non-fatal: the
  // backend still scopes by the session, this is display-only.
  useEffect(() => {
    let cancelled = false;
    studentApi
      .getProfile()
      .then((profile) => {
        if (!cancelled && profile?.department && profile.year && profile.section) {
          setMyClass({
            department: profile.department,
            year: profile.year,
            section: profile.section,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Load candidates from API
  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Map UI gender values to backend values
      // "girls" -> "Female", "boys" -> "Male"
      const genderMap: Record<string, string> = {
        girls: "Female",
        boys: "Male",
      };
      const backendGender = filters.gender !== "all" ? genderMap[filters.gender] || filters.gender : undefined;

      // Only gender is filterable here. The list itself is scoped to the
      // student's own course / year / section on the server — never sent as
      // client-chosen filters.
      const data = await listCandidates({
        gender: backendGender,
      });
      setCandidates(data);
    } catch (err) {
      console.error("Failed to load candidates:", err);
      setError("Failed to load candidates. Please try again.");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Event-handler retry (loading flag is set here, not inside the effect).
  const retry = () => {
    setLoading(true);
    setError(null);
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

  const filteredCandidates = useMemo(() => {
    let results = [...candidates];

    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.id.toLowerCase().includes(lower) ||
          c.department.toLowerCase().includes(lower)
      );
    }

    if (sortBy === "name-asc") {
      results.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      results.sort((a, b) => b.name.localeCompare(a.name));
    }

    return results;
  }, [candidates, searchQuery, sortBy]);

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
        </div>
      </div>

      {myClass && (
        <div className="border-b border-border shrink-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
            <p className="text-sm text-text-secondary">
              Showing candidates of your class:{" "}
              <span className="font-medium text-text-primary">
                {myClass.department} • {myClass.year} • Section {myClass.section}
              </span>
            </p>
          </div>
        </div>
      )}

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
        <div className="max-w-7xl mx-auto space-y-5">
          <CandidateSearch
            onSearchChange={setSearchQuery}
            placeholder="Search candidates..."
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
            <div className="flex-1 min-w-0">
              <CandidateFilters filters={filters} onFilterChange={setFilters} />
            </div>
            <div className="flex items-center justify-between gap-3 w-full sm:w-auto sm:justify-start sm:shrink-0">
              <CandidateSort sortBy={sortBy} onSortChange={(v) => setSortBy(v as "name-asc" | "name-desc")} />
              <CandidateCount count={filteredCandidates.length} />
            </div>
          </div>

          {filteredCandidates.length > 0 ? (
            <CandidateGrid
              candidates={filteredCandidates}
              onCompare={toggleCompare}
              comparedIds={comparedIds}
              onSelect={toggleSelect}
              selectedIds={selectedIds}
            />
          ) : (
            <EmptyState
              title="No Candidates Found"
              description="No approved candidates yet. Check back after elections open."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setFilters({ gender: "all" });
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          )}
        </div>
      </main>
    </StudentLayout>
  );
}
