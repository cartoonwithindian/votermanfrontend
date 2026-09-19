"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Button } from "@/components/ui/Button";
import { ReceiptHeader } from "@/components/receipt/ReceiptHeader";
import { ReceiptId } from "@/components/receipt/ReceiptId";
import { ReceiptInformation } from "@/components/receipt/ReceiptInformation";
import { PrivacyNotice } from "@/components/receipt/PrivacyNotice";
import { ReceiptQRCode } from "@/components/receipt/ReceiptQRCode";
import { ReceiptVerification } from "@/components/receipt/ReceiptVerification";
import { ReceiptActions } from "@/components/receipt/ReceiptActions";
import { ReceiptHistory } from "@/components/receipt/ReceiptHistory";
import { listElections, getMyElectionReceipt, type ElectionInfo, type VoteReceipt as ApiReceipt } from "@/lib/voting-api";
import { ArrowLeft, Users, Loader2 } from "lucide-react";

type ReceiptStatus = "recorded" | "pending" | "invalid" | "not_found" | "error";

interface VoteReceipt {
  id: string;
  receiptId: string;
  electionName: string;
  status: ReceiptStatus;
  submittedAt: string;
  submittedDate: string;
  submittedTime: string;
  electionStatus: string;
  verificationUrl: string;
}

interface ReceiptHistoryItem {
  electionName: string;
  receiptId: string;
  status: ReceiptStatus;
  date: string;
}

function formatSubmittedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateOnly(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDisplayReceipt(
  election: ElectionInfo,
  receipt: ApiReceipt
): VoteReceipt {
  const id = receipt.receiptId != null ? String(receipt.receiptId) : receipt.receiptHash.slice(0, 10);
  return {
    id,
    receiptId: id,
    electionName: election.name,
    status: "recorded",
    submittedAt: formatSubmittedAt(receipt.createdAt),
    submittedDate: formatDateOnly(receipt.createdAt),
    submittedTime: "",
    electionStatus: election.status === "OPEN" ? "Voting Open" : election.status,
    verificationUrl: `/verify/${id}`,
  };
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; current: VoteReceipt | null; history: ReceiptHistoryItem[] };

export default function ReceiptPage() {
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const elections = await listElections();
        const found: { election: ElectionInfo; receipt: ApiReceipt }[] = [];

        for (const election of elections) {
          const receipt = await getMyElectionReceipt(election.id);
          if (receipt) found.push({ election, receipt });
        }

        if (!alive) return;

        // Newest first.
        found.sort(
          (a, b) =>
            new Date(b.receipt.createdAt).getTime() - new Date(a.receipt.createdAt).getTime()
        );

        const history: ReceiptHistoryItem[] = found.map(({ election, receipt }) => ({
          electionName: election.name,
          receiptId: receipt.receiptId != null ? String(receipt.receiptId) : receipt.receiptHash.slice(0, 10),
          status: "recorded",
          date: formatDateOnly(receipt.createdAt),
        }));

        setState({
          phase: "ready",
          current: found[0] ? toDisplayReceipt(found[0].election, found[0].receipt) : null,
          history,
        });
      } catch (err) {
        if (!alive) return;
        const status = (err as { status?: number })?.status;
        setState({
          phase: "error",
          message:
            status === 401
              ? "Please sign in to view your vote receipts."
              : err instanceof Error
                ? err.message
                : "Failed to load your receipts.",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <StudentLayout>
      {state.phase === "loading" && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      )}

      {state.phase === "error" && (
        <div className="max-w-4xl mx-auto space-y-6">
          <ReceiptHeader electionName="Vote Receipt" />
          <div className="bg-white rounded-2xl p-12 border border-border shadow-sm text-center">
            <p className="text-text-secondary text-sm">{state.message}</p>
          </div>
        </div>
      )}

      {state.phase === "ready" && (
        <div className="max-w-4xl mx-auto space-y-6">
          {!state.current ? (
            <>
              <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-text-primary">Vote Receipt</h1>
                <p className="text-text-secondary text-sm max-w-xl mx-auto">
                  You haven&apos;t cast a vote in any election yet, so there is no
                  receipt to show. Cast your vote to receive a receipt.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Header */}
              <ReceiptHeader electionName={state.current.electionName} />

              {/* Receipt ID */}
              <ReceiptId receiptId={state.current.receiptId} />

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  <ReceiptInformation receipt={state.current} />
                  <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <h3 className="text-sm font-semibold text-text-primary mb-3">
                      Receipt Actions
                    </h3>
                    <ReceiptActions receipt={state.current} />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <PrivacyNotice />
                  <ReceiptQRCode
                    receiptId={state.current.receiptId}
                    verificationUrl={state.current.verificationUrl}
                  />
                </div>
              </div>

              {/* Verification */}
              <ReceiptVerification />

              {/* Receipt History */}
              <ReceiptHistory history={state.history} />
            </>
          )}

          {/* Navigation */}
          <div className="flex flex-wrap gap-3 justify-center pb-8">
            <Link href="/student/dashboard">
              <Button variant="secondary" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/student/candidates">
              <Button variant="ghost" className="gap-2">
                <Users className="w-4 h-4" />
                View Candidates
              </Button>
            </Link>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
