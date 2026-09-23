"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VotingProgress } from "@/components/voting/VotingProgress";
import { BallotReview } from "@/components/voting/BallotReview";
import { PrivacyNotice } from "@/components/voting/PrivacyNotice";
import { ConfirmationModal } from "@/components/voting/ConfirmationModal";
import { VotingProvider, useVoting } from "@/components/voting/VotingContext";
import {
  listElections,
  fetchBallot,
  checkVoted,
  submitBallot,
  mapBallotToVotingPositions,
} from "@/lib/voting-api";
import type { VotingPosition } from "@/lib/election-voting-data";
import { AlertCircle } from "lucide-react";

const STEPS = ["Select Candidates", "Review Ballot", "Confirm Vote"];

function ReviewPageInner({ searchParams }: { searchParams: { get(key: string): string | null } }) {
  const router = useRouter();
  const { selections, seedSelections, resetSelections } = useVoting();

  const [positions, setPositions] = useState<VotingPosition[]>([]);
  const [electionId, setElectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const queryElection = (searchParams?.get("election") || "").trim();
        const open = (await listElections().catch(() => []))
          .filter((e) => e.status === "OPEN")
          .map((e) => String(e.id));

        // Strict election from the URL: vote in exactly the election the
        // voter chose. No silent fallback to some other open election.
        const electionIdFromUrl = queryElection
          ? open.includes(queryElection)
            ? queryElection
            : null
          : open[0] || null;

        if (!electionIdFromUrl) {
          setLoadError(
            queryElection
              ? "This election is not open for voting right now."
              : "There is no election open for voting right now."
          );
          setLoading(false);
          return;
        }

        const { positions: ballot, exists, votingOpen } = await fetchBallot(electionIdFromUrl);
        if (!alive) return;
        if (exists && !votingOpen) {
          setLoadError("Voting has not started for your class yet.");
          setLoading(false);
          return;
        }
        if (ballot.length === 0) {
          setLoadError("No voting positions are available for your class in this election.");
          setLoading(false);
          return;
        }
        const check = await checkVoted(electionIdFromUrl, ballot.map((p) => p.id));
        if (!alive) return;

        const remaining = check.voted.length > 0
          ? ballot.filter((p) => !check.voted.includes(p.id))
          : ballot;

        if (remaining.length === 0) {
          setLoadError("Your ballot for this election has already been submitted.");
          setLoading(false);
          return;
        }

        const uiPositions = mapBallotToVotingPositions(remaining);
        setPositions(uiPositions);
        seedSelections(uiPositions);
        setElectionId(electionIdFromUrl);
      } catch (err) {
        if (!alive) return;
        const status = (err as { status?: number })?.status;
        if (status === 401) {
          setLoadError("Please sign in to review and submit your ballot.");
        } else {
          setLoadError(
            err instanceof Error ? err.message : "Failed to load your ballot."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [searchParams, seedSelections]);

  const handleChangeSelection = () => {
    router.push("/student/vote");
  };

  const handleSubmit = () => {
    setSubmitError(null);
    setShowModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (electionId === null) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const constituencyId = positions[0]?.constituencyId;
    const toSubmit = positions
      .map((p) => ({
        positionId: p.id,
        candidateId: selections.find((s) => s.positionId === p.id)?.candidateId,
      }))
      .filter(
        (x): x is { positionId: string; candidateId: string } => !!x.candidateId
      );

    if (constituencyId === undefined || toSubmit.length === 0) {
      setIsSubmitting(false);
      setShowModal(false);
      setSubmitError("Your ballot is incomplete. Please review your selections.");
      return;
    }

    try {
      await submitBallot(electionId, constituencyId, toSubmit);
    } catch (err) {
      setIsSubmitting(false);
      setShowModal(false);
      const status = (err as { status?: number })?.status;
      const message =
        err instanceof Error
          ? err.message
          : "Your vote could not be submitted. Please try again.";
      setSubmitError(
        status === 401
          ? "Your session has expired. Please sign in again."
          : status === 409
            ? "You have already voted for one or more of these positions. Your ballot was not submitted."
            : status === 403
              ? "You are not eligible to vote in this election."
              : message
      );
      return;
    }

    // One atomic ballot submitted - remember the result for the success screen.
    try {
      window.sessionStorage.setItem(
        "campusvote_last_ballot",
        JSON.stringify({
          electionId,
          submittedAt: new Date().toISOString(),
          submittedPositions: toSubmit.length,
        })
      );
    } catch {
      // Non-fatal: success page falls back to the generic copy.
    }

    setIsSubmitting(false);
    setShowModal(false);
    resetSelections();
    router.replace("/student/vote/success");
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </StudentLayout>
    );
  }

  if (loadError || positions.length === 0) {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Review Your Ballot</h1>
          </div>
          <Card className="p-12 text-center">
            <AlertCircle className="w-10 h-10 text-warning mx-auto mb-4" />
            <p className="text-text-secondary text-sm">{loadError || "No positions available."}</p>
            <div className="flex gap-3 justify-center mt-6">
              <Button variant="ghost" onClick={() => router.push("/student/vote")}>
                Back to Voting
              </Button>
              <Button variant="primary" onClick={() => router.push("/student/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <>
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary mb-1">Review Your Ballot</h1>
            <p className="text-sm text-text-secondary">
              Review your selections carefully before submitting your vote.
            </p>
          </div>

          <VotingProgress currentStep={1} totalSteps={3} steps={STEPS} />

          <PrivacyNotice />

          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 border border-error/20">
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              <p className="text-xs text-error font-medium">{submitError}</p>
            </div>
          )}

          <BallotReview
            positions={positions}
            selections={selections}
            onChangeSelection={handleChangeSelection}
          />

          <Card className="p-5 border-border">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-text-secondary">
                I have reviewed my selections and understand that my vote cannot be changed after submission.
              </span>
            </label>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="md"
              className="gap-1.5"
              onClick={() => router.push("/student/vote")}
            >
              Back to Voting
            </Button>
            <Button
              variant="primary"
              size="lg"
              className="flex-1 gap-2"
              disabled={!isConfirmed || isSubmitting}
              onClick={handleSubmit}
            >
              Confirm & Submit Vote
            </Button>
          </div>
        </div>
      </StudentLayout>

      <ConfirmationModal
        isOpen={showModal}
        isSubmitting={isSubmitting}
        onConfirm={handleConfirmSubmit}
        onBack={() => setShowModal(false)}
      />
    </>
  );
}

function ReviewPageSuspense() {
  const searchParams = useSearchParams();
  return <ReviewPageInner searchParams={searchParams} />;
}

export default function ReviewPage() {
  return (
    <VotingProvider>
      <Suspense fallback={null}>
        <ReviewPageSuspense />
      </Suspense>
    </VotingProvider>
  );
}
