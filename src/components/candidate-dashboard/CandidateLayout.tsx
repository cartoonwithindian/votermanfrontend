"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { CandidateSidebar } from "./CandidateSidebar";
import { CandidateNavbar } from "./CandidateNavbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { getMyApplication } from "@/lib/candidate-api";
import { getMe } from "@/lib/api/v1";
import type { ApplicationStatus } from "@/lib/candidate-dashboard-data";

export interface CandidateLayoutProps {
  children: React.ReactNode;
  candidateName?: string;
  candidateId?: string;
}

const PROTECTED_ROUTES = [
  "/candidate/dashboard",
  "/candidate/profile",
  "/candidate/campaign",
  "/candidate/manifesto",
  "/candidate/preview",
  "/candidate/settings",
];

function canAccessRoute(pathname: string, status: ApplicationStatus): boolean {
  if (status === "approved") return true;

  if (pathname.startsWith("/candidate/status")) return true;
  if (pathname.startsWith("/candidate/apply")) return true;

  return !PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
}

export const CandidateLayout: React.FC<CandidateLayoutProps> = ({
  children,
  candidateName,
  candidateId,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [status, setStatus] = useState<ApplicationStatus>("draft");
  const [checking, setChecking] = useState(true);
  const [userName, setUserName] = useState(candidateName || "Candidate");
  const [userId, setUserId] = useState(candidateId || "");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let alive = true;
    (async () => {
      let currentStatus: ApplicationStatus = "draft";
      let userRole = "";
      try {
        // Identity comes from both the candidate application and the account:
        // application name/enrollment (once applied) take priority, otherwise
        // the registration name/roll number from the backend account.
        const [app, me] = await Promise.all([
          getMyApplication().catch(() => null),
          getMe().catch(() => null),
        ]);
        if (alive) {
          if (app) {
            setUserName(app.name || me?.user?.fullName || me?.user?.name || "Candidate");
            setUserId(app.enrollmentNumber || me?.user?.rollNumber || "");
            currentStatus = app.status;
          } else {
            setUserName(me?.user?.fullName || me?.user?.name || "Candidate");
            setUserId(me?.user?.rollNumber || "");
          }
          userRole = me?.user?.role || "";
        }
      } catch {
        if (alive) {
          setUserName("Candidate");
          setUserId("");
        }
      }

      if (!alive) return;
      setStatus(currentStatus);

      // Role guard: keep users inside the candidate portal. ADMIN may browse
      // it, CAD goes to their own dashboard. A STUDENT is a pending applicant
      // (CANDIDATE is earned on approval) — confine them to the waiting room
      // instead of ejecting them to /student/dashboard (this used to send
      // profile/dashboard clicks out of the candidate portal).
      const normalizedRole = String(userRole || "").toUpperCase();
      const isWaitingRoom =
        pathname.startsWith("/candidate/apply") || pathname.startsWith("/candidate/status");
      const isApprovedCandidate = currentStatus === "approved";
      if (normalizedRole === "CAD") {
        router.replace("/cad/dashboard");
        return;
      }
      if (normalizedRole && normalizedRole !== "CANDIDATE" && normalizedRole !== "ADMIN") {
        if (!isApprovedCandidate && !isWaitingRoom) {
          router.replace("/candidate/status");
          return;
        }
      }

      if (!canAccessRoute(pathname, currentStatus)) {
        router.replace("/candidate/status");
        return;
      }

      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex h-screen bg-bg-primary items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <div className="hidden lg:flex">
        <CandidateSidebar status={status} />
      </div>
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        customSidebar={
          <CandidateSidebar
            className="w-full h-full border-r-0 rounded-none"
            onNavigate={() => setMobileNavOpen(false)}
            status={status}
          />
        }
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <CandidateNavbar
          onToggleMenu={() => setMobileNavOpen((prev) => !prev)}
          candidateName={userName}
          candidateId={userId}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
