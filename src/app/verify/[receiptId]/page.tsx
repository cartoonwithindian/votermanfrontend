"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, XCircle, ArrowLeft, Shield, Loader2 } from "lucide-react";
import { verifyReceiptPublic, type PublicReceipt } from "@/lib/voting-api";

type VerifyState =
  | { phase: "loading" }
  | { phase: "valid"; receipt: PublicReceipt }
  | { phase: "invalid" };

export default function VerifyPage() {
  const { receiptId } = useParams<{ receiptId: string }>();
  const [state, setState] = useState<VerifyState>({ phase: "loading" });

  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await verifyReceiptPublic(receiptId || "");
      if (!alive) return;
      setState(
        result.valid && result.receipt
          ? { phase: "valid", receipt: result.receipt }
          : { phase: "invalid" }
      );
    })();
    return () => {
      alive = false;
    };
  }, [receiptId]);

  const submittedLabel = state.phase === "valid"
    ? state.receipt.votedAt
      ? new Date(state.receipt.votedAt).toLocaleString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : ""
    : "";

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-border py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center font-bold text-white text-xs">
            CV
          </div>
          <span className="font-semibold text-text-primary text-sm">Don Bosco Institute of Technology</span>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full space-y-6">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-text-primary mb-1">
              Vote Receipt Verification
            </h1>
            <p className="text-sm text-text-secondary">
              Verify the authenticity of a CampusVote receipt.
            </p>
          </div>

          {state.phase === "loading" && (
            <Card className="p-6 border-border text-center">
              <Loader2 size={32} className="animate-spin text-primary-600 mx-auto mb-4" />
              <p className="text-sm text-text-secondary">Verifying receipt...</p>
            </Card>
          )}

          {state.phase === "valid" && (
            <>
              {/* Valid Receipt */}
              <Card className="p-6 border-border text-center">
                <div className="w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h2 className="text-lg font-bold text-success mb-2">
                  Valid Receipt
                </h2>
                <p className="text-sm text-text-secondary mb-6">
                  This receipt belongs to a successfully recorded ballot.
                </p>

                <div className="space-y-3 text-left bg-primary-50 rounded-xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Receipt ID</span>
                    <span className="font-mono font-medium text-text-primary">
                      {state.receipt.receiptId ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Election</span>
                    <span className="text-text-primary">
                      {state.receipt.electionName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary">Status</span>
                    <Badge variant="success" className="text-[10px]">
                      Ballot Recorded
                    </Badge>
                  </div>
                  {submittedLabel && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">Submitted</span>
                      <span className="text-text-primary">{submittedLabel}</span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Privacy Notice */}
              <Card className="p-4 border-primary-100 bg-primary-50">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-xs text-primary-700 mb-1">
                      Privacy Protected
                    </h4>
                    <p className="text-[11px] text-primary-600/80 leading-relaxed">
                      This verification only confirms that a ballot was recorded. Student identity and candidate selections are never displayed.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {state.phase === "invalid" && (
            <Card className="p-6 border-border text-center">
              <div className="w-16 h-16 rounded-full bg-error-50 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-error" />
              </div>
              <h2 className="text-lg font-bold text-text-primary mb-2">
                Receipt Not Found
              </h2>
              <p className="text-sm text-text-secondary mb-2">
                We couldn&apos;t verify this receipt. The Receipt ID may be incorrect.
              </p>
              <p className="text-xs text-text-secondary mb-6 font-mono">
                {receiptId}
              </p>
            </Card>
          )}

          {/* Back */}
          <div className="text-center">
            <Link href="/student/login">
              <Button variant="secondary" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Sign In to View Your Receipt
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
