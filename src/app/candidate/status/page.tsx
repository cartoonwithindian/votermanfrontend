"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CandidateLayout } from "@/components/candidate-dashboard/CandidateLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getMyApplication } from "@/lib/candidate-api";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  FileText,
  Shield,
  AlertTriangle,
  Send,
  Lock,
} from "lucide-react";

export default function CandidateStatusPage() {
  const [profile, setProfile] = useState({
    id: "",
    name: "",
    position: "",
    enrollmentNumber: "",
    department: "",
    year: "",
    section: "",
    bio: "",
    applicationStatus: "draft" as string,
    adminNote: null as string | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const status = profile.applicationStatus;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const app = await getMyApplication();
        if (!alive) return;
        if (app) {
          setProfile({
            id: app.id,
            name: app.name,
            position: app.position,
            enrollmentNumber: app.enrollmentNumber,
            department: app.department,
            year: app.year,
            section: app.section,
            bio: app.bio,
            applicationStatus: app.status,
            adminNote: app.adminNote,
          });
        }
      } catch {
        if (alive) setError("Failed to load your application. Please try again.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const renderStatusCard = () => {
    switch (status) {
      case "approved":
        return (
          <Card className="p-6 border-success/20 bg-success-50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-text-primary">
                    Candidate Approved
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-100 text-success-700 text-xs font-medium">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Your profile has been approved and published. The application is now locked and cannot be edited.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-white dark:bg-[#252540]">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                      Position
                    </p>
                    <p className="text-sm font-semibold text-text-primary">
                      {profile.position}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#252540]">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                      Candidate ID
                    </p>
                    <p className="text-sm font-mono font-semibold text-text-primary">
                      {profile.id}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#252540]">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                      Application
                    </p>
                    <Badge variant="success" className="text-[10px]">
                      Approved
                    </Badge>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-[#252540]">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                      Profile
                    </p>
                    <Badge variant="success" className="text-[10px]">
                      Published
                    </Badge>
                  </div>
                </div>
                <Link href="/candidate/dashboard">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );

      case "submitted":
      case "under_review":
        return (
          <Card className="p-6 border-warning/20 bg-warning-50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-text-primary">
                    Under Review
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning-100 text-warning-700 text-xs font-medium">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Your application has been submitted and is awaiting administration approval. The application is now locked and cannot be edited.
                </p>
                <div className="flex gap-3">
                  <Link href="/candidate/preview">
                    <Button variant="secondary" size="sm" className="gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      View Profile Preview
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        );

      case "changes_requested":
        return (
          <Card className="p-6 border-warning/20 bg-warning-50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-text-primary mb-1">
                  Changes Requested
                </h2>
                <p className="text-sm text-text-secondary mb-3">
                  Election administration has requested changes to your profile.
                </p>
                {profile.adminNote && (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#252540] mb-4">
                    <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                      Requested Changes
                    </p>
                    <p className="text-sm text-text-primary">
                      {profile.adminNote}
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Link href="/candidate/apply">
                    <Button variant="primary" size="sm" className="gap-1.5">
                      Update & Resubmit
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        );

      case "rejected":
        return (
          <Card className="p-6 border-error/20 bg-error-50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-error flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-text-primary mb-1">
                  Application Rejected
                </h2>
                <p className="text-sm text-text-secondary mb-3">
                  Your candidate application was not approved.
                </p>
                <div className="p-3 rounded-xl bg-white dark:bg-[#252540] mb-4">
                  <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">
                    Reason
                  </p>
                  <p className="text-sm text-text-primary">
                    {profile.adminNote || "Required information could not be verified."}
                  </p>
                </div>
                <Link href="/candidate/apply">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    Apply Again
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );

      case "draft":
      default:
        return (
          <Card className="p-6 border-info/20 bg-info-50">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-info flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-text-primary mb-1">
                  Application Not Started
                </h2>
                <p className="text-sm text-text-secondary mb-4">
                  Complete the candidate application form to submit your candidacy for the election.
                </p>
                <Link href="/candidate/apply">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Start Application
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <CandidateLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md w-full text-center p-8 border-border">
            <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Loading Application
            </h2>
            <p className="text-sm text-text-secondary">
              Fetching your application status…
            </p>
          </Card>
        </div>
      </CandidateLayout>
    );
  }

  if (error) {
    return (
      <CandidateLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="max-w-md w-full text-center p-8 border-border">
            <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-error" />
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Couldn&apos;t Load Application
            </h2>
            <p className="text-sm text-text-secondary mb-6">{error}</p>
          </Card>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Application Status
          </h1>
          <p className="text-sm text-text-secondary">
            Track your candidate application progress.
          </p>
        </div>

        {renderStatusCard()}

        {/* Timeline */}
        <Card className="p-6 border-border">
          <h2 className="text-lg font-bold text-text-primary mb-5">
            Application Timeline
          </h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-5">
              {[
                { label: "Application Started", completed: status !== "draft", current: status === "draft" },
                { label: "Profile Submitted", completed: ["under_review", "changes_requested", "approved", "rejected"].includes(status), current: false },
                { label: "Under Review", completed: ["approved", "rejected"].includes(status), current: status === "under_review" || status === "submitted" },
                { label: status === "rejected" ? "Rejected" : "Approved", completed: status === "approved" || status === "rejected", current: status === "approved" },
              ].map((event, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      event.completed
                        ? event.current
                          ? "bg-primary-600"
                          : "bg-success"
                        : "bg-border"
                    }`}
                  >
                    {event.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : (
                      <Clock className="w-4 h-4 text-text-secondary" />
                    )}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          event.current
                            ? "text-primary-700"
                            : event.completed
                            ? "text-text-primary"
                            : "text-text-secondary"
                        }`}
                      >
                        {event.label}
                      </p>
                      {event.current && (
                        <Badge variant="info" className="text-[10px]">
                          Current Step
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Election Information */}
        <Card className="p-6 border-border">
          <h2 className="text-lg font-bold text-text-primary mb-4">
            Election Information
          </h2>
            <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Election</span>
              <span className="font-medium text-text-primary">
                Student Council Election 2026
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Position</span>
              <span className="font-medium text-text-primary">
                {profile.position || "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Candidate ID</span>
              <span className="font-mono font-medium text-text-primary">
                {profile.id || "—"}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Registration</span>
              <Badge variant="neutral" className="text-[10px]">
                Closed
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Voting</span>
              <Badge variant="success" className="text-[10px]">
                Open
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Results</span>
              <span className="font-medium text-text-primary">
                To be announced
              </span>
            </div>
          </div>
        </Card>

        {/* Guidelines */}
        <Card className="p-6 border-border">
          <div className="flex items-start gap-3 mb-3">
            <Shield className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Candidate Guidelines
              </h2>
            </div>
          </div>
          <ul className="space-y-2 mb-4 ml-8">
            {[
              "Provide accurate profile information.",
              "Follow election administration rules.",
              "Do not impersonate another candidate.",
              "Do not upload offensive content.",
              "Do not use misleading institutional branding.",
              "Do not attempt to manipulate voting systems.",
            ].map((rule, i) => (
              <li
                key={i}
                className="text-sm text-text-secondary flex items-start gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                {rule}
              </li>
            ))}
          </ul>
          <Link href="/candidate/guidelines">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" />
              View Full Guidelines
            </Button>
          </Link>
        </Card>
      </div>
    </CandidateLayout>
  );
}
