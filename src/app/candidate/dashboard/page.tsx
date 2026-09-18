"use client";

import React from "react";
import Link from "next/link";
import { CandidateLayout } from "@/components/candidate-dashboard/CandidateLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  PROFILE_CHECKLIST,
} from "@/lib/candidate-dashboard-data";
import { useCandidateApplication } from "@/hooks/useCandidateApplication";
import {
  User,
  Megaphone,
  FileText,
  Eye,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Bell,
  Shield,
  BookOpen,
  TrendingUp,
} from "lucide-react";

export default function CandidateDashboardPage() {
  const { application } = useCandidateApplication();
  const profile = application;
  const completedCount = PROFILE_CHECKLIST.filter((item) => item.checked).length;
  const totalItems = PROFILE_CHECKLIST.length;

  return (
    <CandidateLayout>
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Candidate Dashboard
            </h1>
            <p className="text-sm text-text-secondary">
              Manage your candidate profile and election campaign information.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="info" size="md">
              Student Council Election 2026
            </Badge>
            <div className="flex items-center gap-1.5 text-xs font-medium text-success-600 bg-success-50 border border-success-100 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />
              Voting Open
            </div>
          </div>
        </div>

        {/* Application Status */}
        <Card className="!p-0 overflow-hidden">
          {application ? (
            <>
              {application.status === "approved" ? (
                <div className="bg-success-50 border-b border-success-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-success-500 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-success-700">Approved</h3>
                      <p className="text-sm text-success-600">
                        Your candidate profile has been approved.
                      </p>
                    </div>
                  </div>
                </div>
              ) : application.status === "rejected" ? (
                <div className="bg-error-50 border-b border-error-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-error-500 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-error-700">Rejected</h3>
                      <p className="text-sm text-error-600">
                        {application.rejectionReason || "Your application was not approved."}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-warning-50 border-b border-warning-100 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-warning-700">Under Review</h3>
                      <p className="text-sm text-warning-600">
                        Your application is being reviewed by the election admin.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="px-6 py-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Position</p>
                    <p className="font-semibold text-text-primary">{application.position}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Candidate ID</p>
                    <p className="font-semibold text-text-primary">{application.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Application</p>
                    <Badge variant={application.status === "approved" ? "success" : application.status === "rejected" ? "error" : "warning"} size="sm">
                      {application.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Profile</p>
                    <Badge variant={application.status === "approved" ? "success" : "neutral"} size="sm">
                      {application.status === "approved" ? "Published" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-primary-50 border-b border-primary-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-700">No Application Yet</h3>
                  <p className="text-sm text-primary-600">
                    Start your candidate application to get started.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Completion */}
          <Card className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-text-primary">Profile Completion</h3>
            </div>
            {application ? (
              <>
                {(() => {
                  const fields = [application.name, application.position, application.bio, application.email, application.phone, application.department];
                  const filled = fields.filter(Boolean).length;
                  const pct = Math.round((filled / fields.length) * 100);
                  return (
                    <>
                      <div className="text-center mb-4">
                        <span className="text-4xl font-bold text-primary-600">{pct}%</span>
                        <p className="text-xs text-text-secondary mt-1">{filled} of {fields.length} fields completed</p>
                      </div>
                      <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2 mb-5">
                        <div className="bg-primary-600 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-text-secondary">No application submitted yet.</p>
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/candidate/profile">
              <Card hoverable className="h-full">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="font-semibold text-text-primary mb-1">Edit Profile</h4>
                <p className="text-xs text-text-secondary">Update your profile information</p>
              </Card>
            </Link>
            <Link href="/candidate/campaign">
              <Card hoverable className="h-full">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                  <Megaphone className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="font-semibold text-text-primary mb-1">Manage Campaign</h4>
                <p className="text-xs text-text-secondary">Upload logo and campaign info</p>
              </Card>
            </Link>
            <Link href="/candidate/manifesto">
              <Card hoverable className="h-full">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                  <FileText className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="font-semibold text-text-primary mb-1">Edit Manifesto</h4>
                <p className="text-xs text-text-secondary">Create your election manifesto</p>
              </Card>
            </Link>
            <Link href="/candidate/preview">
              <Card hoverable className="h-full">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                  <Eye className="w-5 h-5 text-primary-600" />
                </div>
                <h4 className="font-semibold text-text-primary mb-1">Preview Profile</h4>
                <p className="text-xs text-text-secondary">See how students view you</p>
              </Card>
            </Link>
          </div>
        </div>

        {/* Notifications & Election Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-text-primary">Notifications</h3>
              </div>
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {application?.id ? (
                <p className="text-sm text-text-secondary">No notifications yet.</p>
              ) : (
                <p className="text-sm text-text-secondary">Submit your application to get started.</p>
              )}
            </div>
          </Card>

          {/* Election Information */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-text-primary">Election Information</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-border">
                <span className="text-sm text-text-secondary">Election</span>
                <span className="text-sm font-medium text-text-primary">Student Council Election 2026</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-border">
                <span className="text-sm text-text-secondary">Position</span>
                <span className="text-sm font-medium text-text-primary">{application?.position || "—"}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-border">
                <span className="text-sm text-text-secondary">Candidate ID</span>
                <span className="text-sm font-medium text-text-primary">{application?.id || "—"}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-border">
                <span className="text-sm text-text-secondary">Registration</span>
                <Badge variant="neutral" size="sm">Closed</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-border">
                <span className="text-sm text-text-secondary">Voting</span>
                <Badge variant="success" size="sm">Open</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-border">
                <span className="text-sm text-text-secondary">Results Date</span>
                <span className="text-sm font-medium text-text-primary">To be announced</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Guidelines & Help */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Candidate Guidelines */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-text-primary">Candidate Guidelines</h3>
            </div>
            <ul className="space-y-2.5 mb-5">
              <li className="flex items-start gap-2.5 text-sm text-text-secondary">
                <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                Provide accurate profile information.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-text-secondary">
                <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                Follow election administration rules.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-text-secondary">
                <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                Do not impersonate another candidate.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-text-secondary">
                <CheckCircle2 className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                Do not upload offensive content.
              </li>
            </ul>
            <Link href="/candidate/guidelines">
              <Button variant="outline" size="sm" className="w-full">
                <BookOpen className="w-4 h-4" />
                View Full Guidelines
              </Button>
            </Link>
          </Card>

          {/* Need Help */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-text-primary">Need Help?</h3>
            </div>
            <p className="text-sm text-text-secondary mb-5">
              Contact election administration if you have questions about your candidate profile,
              application status, or election rules.
            </p>
            <Link href="/candidate/help">
              <Button variant="primary" size="md" className="w-full">
                Help &amp; Support
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </CandidateLayout>
  );
}
