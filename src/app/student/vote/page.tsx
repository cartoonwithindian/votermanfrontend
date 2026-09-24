"use client";

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { VotingProgress } from "@/components/voting/VotingProgress";
import { CandidateVotingCard } from "@/components/voting/CandidateVotingCard";
import { VotingNavigation } from "@/components/voting/VotingNavigation";
import { VotingProvider, useVoting } from "@/components/voting/VotingContext";
import { AlreadyVotedState, VotingClosedState } from "@/components/voting/VotingStates";
import {
  findElectionWithBallot,
  fetchBallot,
  fetchMyClassCandidates,
  checkVoted,
  mapBallotToVotingPositions,
} from "@/lib/voting-api";
import type { MyClassCandidates } from "@/lib/voting-api";
import type { VotingPosition } from "@/lib/election-voting-data";
import { AlertTriangle, AlertCircle } from "lucide-react";

const STEPS = ["Select Candidates", "Review Ballot", "Confirm Vote"];

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "noauth" }
  | { phase: "closed" }
  | { phase: "preview"; preview: MyClassCandidates }
  | { phase: "already" }
  | { phase: "ready"; electionId: string; electionName: string };

function VotePageInner() {
  const router = useRouter();
  const { setCandidate, getSelection, seedSelections } = useVoting();

  const [state, setState] = useState<PageState>({ phase: "loading" });
  const [positions, setPositions] = useState<VotingPosition[]>([]);
  const [currentPosition, setCurrentPosition] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const election = await findElectionWithBallot();
        if (!alive) return;
        if (!election) {
          try {
            const preview = await fetchMyClassCandidates();
            if (!alive) return;
            const total = preview.seats.reduce((n, s) => n + s.candidates.length, 0);
            if (preview.election && total > 0) {
              setState({ phase: "preview", preview });
            } else {
              setState({ phase: "closed" });
            }
          } catch (err) {
            if (!alive) return;
            const status = (err as { status?: number })?.status;
            if (status === 401) {
              setState({ phase: "noauth" });
            } else {
              setState({ phase: "closed" });
            }
          }
          return;
        }

        const { positions: ballot, exists, votingOpen } = await fetchBallot(election.id);
        if (!alive) return;
        if (exists && !votingOpen) {
          setState({
            phase: "error",
            message: "Voting has not started for your class yet.",
          });
          return;
        }
        if (ballot.length === 0) {
          setState({
            phase: "error",
            message:
              "No voting positions are available for your class in this election yet. Candidates may not have been placed yet - please check again later.",
          });
          return;
        }

        // Ask the backend which of these positions the student already voted.
        const check = await checkVoted(election.id, ballot.map((p) => p.id));
        if (!alive) return;

        const remaining = check.voted.length > 0
          ? ballot.filter((p) => !check.voted.includes(p.id))
          : ballot;

        if (remaining.length === 0) {
          setState({ phase: "already" });
          return;
        }

        const uiPositions = mapBallotToVotingPositions(remaining);
        setPositions(uiPositions);
        seedSelections(uiPositions);
        setState({ phase: "ready", electionId: election.id, electionName: election.name });
      } catch (err) {
        if (!alive) return;
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          setState({ phase: "noauth" });
        } else {
          const message =
            err instanceof Error ? err.message : "Failed to load the ballot. Please try again.";
          setState({ phase: "error", message });
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [seedSelections]);

  const currentPositionData = positions[currentPosition];
  const currentSelection = currentPositionData
    ? getSelection(currentPositionData.id)
    : undefined;

  const handleSelectCandidate = useCallback(
    (candidateId: string) => {
      if (!currentPositionData) return;
      setCandidate(currentPositionData.id, candidateId);
    },
    [currentPositionData, setCandidate]
  );

  const handlePrevious = useCallback(() => {
    setCurrentPosition((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (!currentSelection) return;
    if (currentSelection.candidateId === undefined) return;

    if (currentPosition < positions.length - 1) {
      setCurrentPosition((prev) => prev + 1);
    } else if (state.phase === "ready") {
      router.push(`/student/vote/review?election=${state.electionId}`);
    }
  }, [currentSelection, currentPosition, positions.length, router, state]);

  if (state.phase === "loading") {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  if (state.phase === "noauth") {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <Card className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-warning mx-auto mb-4" />
            <h2 className="text-lg font-bold text-text-primary mb-1">Sign in Required</h2>
            <p className="text-sm text-text-secondary mb-6">
              Please sign in to access the ballot.
            </p>
            <Link href="/student/login">
              <Button variant="primary">Sign In</Button>
            </Link>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  if (state.phase === "error") {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Cast Your Vote</h1>
          </div>
          <Card className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-error mx-auto mb-4" />
            <p className="text-text-secondary text-sm">{state.message}</p>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  if (state.phase === "closed") {
    return <VotingClosedState />;
  }

  if (state.phase === "preview") {
    const preview = state.preview;
    const status = preview.election?.status || "";
    const upcoming = status === "DRAFT" || status === "SCHEDULED";
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="info" className="text-[10px]">{preview.election?.name}</Badge>
              <Badge variant={upcoming ? "warning" : "neutral"} className="text-[10px]">{status}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Candidates in Your Class</h1>
            <p className="text-sm text-text-secondary">
              {preview.constituency?.department} · {preview.constituency?.year}
              {preview.constituency?.section ? ` · Sec ${preview.constituency.section}` : ""} —{" "}
              {upcoming
                ? "voting hasn't started yet. These are the candidates standing in your class."
                : "voting has ended for this election."}
            </p>
          </div>
          {preview.seats.map((seat) => (
            <Card key={seat.position.id} className="border-border overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border bg-primary-50/50">
                <h2 className="text-lg font-bold text-text-primary">{seat.position.name}</h2>
                <p className="text-xs text-text-secondary mt-1">
                  {seat.candidates.length} candidate{seat.candidates.length === 1 ? "" : "s"} standing
                </p>
              </div>
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {seat.candidates.map((candidate) => (
                  <div key={candidate.id} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                    {candidate.photo ? (
                      <img src={candidate.photo} alt={candidate.name} className="h-11 w-11 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="h-11 w-11 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary-600">
                          {candidate.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{candidate.name}</p>
                      {candidate.gender && (
                        <p className="text-xs text-text-secondary">{candidate.gender}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </StudentLayout>
    );
  }

  if (state.phase === "already") {
    return <AlreadyVotedState />;
  }

  // ===== ready =====
  if (!currentPositionData) return null;

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="info" className="text-[10px]">{state.electionName}</Badge>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium text-success">Voting Open</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Cast Your Vote</h1>
          <p className="text-sm text-text-secondary">
            Select one candidate for each available position. Review your ballot carefully before submitting.
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-50 border border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <p className="text-xs text-warning font-medium">
            Your vote cannot be changed after submission.
          </p>
        </div>

        <VotingProgress currentStep={0} totalSteps={3} steps={STEPS} />

        <Card className="border-border overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-border bg-primary-50/50">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">
                  Position {currentPosition + 1} of {positions.length}
                </span>
                <h2 className="text-lg font-bold text-text-primary mt-1">
                  {currentPositionData.name}
                </h2>
              </div>
              <Badge variant="info" className="text-[10px]">
                {currentPosition + 1} / {positions.length}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              {currentPositionData.candidates.length > 0
                ? "Select one candidate."
                : "No candidates available for this position."}
            </p>
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            {currentPositionData.candidates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentPositionData.candidates.map((candidate) => (
                  <CandidateVotingCard
                    key={candidate.id}
                    candidate={candidate}
                    isSelected={currentSelection?.candidateId === candidate.id}
                    onSelect={handleSelectCandidate}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-secondary text-center py-4">
                No candidates available for this position.
              </p>
            )}

            {currentSelection?.candidateId === undefined && (
              <p className="text-xs text-text-secondary text-center py-1">
                Please select a candidate to continue.
              </p>
            )}
          </div>

          <div className="p-4 sm:p-5 border-t border-border">
            <VotingNavigation
              currentStep={currentPosition}
              totalSteps={positions.length}
              hasSelection={currentSelection?.candidateId !== undefined}
              onPrevious={handlePrevious}
              onNext={handleNext}
            />
          </div>
        </Card>
      </div>
    </StudentLayout>
  );
}

export default function VotePage() {
  return (
    <VotingProvider>
      <VotePageInner />
    </VotingProvider>
  );
}
