import type { ApplicationStatus } from "./candidate-dashboard-data";
import { candidateApi } from "./api/candidates";
import type { Candidate } from "./candidate-data";
import type { VotingPosition, VotingCandidate } from "./election-voting-data";
import { COURSES, ALL_YEARS, seatLabel } from "./class-data";

export interface CandidateApplicationData {
  id: string;
  name: string;
  enrollmentNumber: string;
  department: string;
  year: string;
  section: string;
  position: string;
  email: string;
  phone: string;
  photo: string | null;
  bio: string;
  manifesto: string;
  gender: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  adminNote: string | null;
  submittedDate: string | null;
  reviewedDate: string | null;
  category: "CLUB" | "CR";
  electionId: number | null;
  constituencyId: number | null;
}

export const POSITION_OPTIONS = [
  "President",
  "Vice President",
  "General Secretary",
  "Treasurer",
  "Cultural Secretary",
  "Sports Secretary",
];

export const DEPARTMENT_OPTIONS = COURSES;

export const YEAR_OPTIONS = ALL_YEARS;

export const SECTION_OPTIONS = ["A1", "A2", "A3"];

export async function getApplicationByEmail(email: string): Promise<CandidateApplicationData | undefined> {
  try {
    const all: any = await candidateApi.getAll();
    const apps = all?.data || all || [];
    if (Array.isArray(apps)) {
      return apps.find((a: any) => a.email?.toLowerCase() === email.toLowerCase());
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * All candidate APPLICATIONS for admin review — real backend source:
 * GET /admin/candidate-applications (the candidate_applications table).
 * The previous implementation read GET /candidates — a nearly-empty legacy
 * table — so submitted applications never showed up for review.
 */
export async function getAllApplications(): Promise<CandidateApplicationData[]> {
  try {
    const res: any = await candidateApi.listApplications();
    const apps: any[] = res?.candidates || res?.data || [];
    return (apps || []).map((a: any) => {
      const isCR = a.category !== "CLUB";
      const seatLine = seatLabel(a.department, a.year, a.section);
      return {
      id: String(a.id),
      name: a.fullName || a.name || "—",
      enrollmentNumber: a.enrollmentNumber || "—",
      department: a.department || "—",
      year: a.year || "—",
      section: a.section || "",
      position: isCR
        ? seatLine || "Class Representative"
        : a.position || a.contestingPosition || "—",
      email: a.email || "—",
      phone: a.phone || "—",
      photo: a.profilePhotoUrl || a.photo || null,
      bio: a.bio || "",
      manifesto: a.manifesto || "",
      gender: a.gender || "",
      status: (a.status || "under_review") as CandidateApplicationData["status"],
      rejectionReason: a.rejectionReason ?? null,
      adminNote: a.changesRequestedReason ?? null,
      submittedDate: a.submittedAt || null,
      reviewedDate: a.reviewedAt || null,
      category: (a.category === "CLUB" ? "CLUB" : "CR") as "CLUB" | "CR",
      electionId: a.electionId ?? null,
      constituencyId: a.constituencyId ?? null,
      };
    });
  } catch {
    return [];
  }
}

export async function getApprovedCandidatesAsCandidateList(): Promise<Candidate[]> {
  try {
    const all: any = await candidateApi.getApproved();
    const apps = all?.data || all || [];
    return apps.map((app: any) => ({
      id: app.id || app.studentId,
      name: app.name,
      position: app.position,
      photo: app.photo,
      bio: app.bio || app.manifesto,
    }));
  } catch {
    return [];
  }
}

export async function getApprovedCandidatesAsVotingPositions(): Promise<VotingPosition[]> {
  try {
    const all: any = await candidateApi.getApproved();
    const apps = all?.data || all || [];

    // Group by position
    const byPosition: Record<string, any[]> = {};
    for (const app of apps) {
      const pos = app.position || "General";
      if (!byPosition[pos]) byPosition[pos] = [];
      byPosition[pos].push(app);
    }

    // Convert to VotingPosition format
    const positions: VotingPosition[] = [];
    let order = 1;
    for (const [posName, candidates] of Object.entries(byPosition)) {
      const votingCandidates: VotingCandidate[] = candidates.map((c: any) => ({
        id: c.id || c.studentId,
        name: c.name,
        department: c.department || "",
        year: c.year || "",
        photoInitials: (c.name || "?").substring(0, 2).toUpperCase(),
        campaignSymbol: "⭐",
        shortManifesto: (c.manifesto || c.bio || "").substring(0, 100),
      }));

      positions.push({
        id: `pos-${order}`,
        name: posName,
        order: order++,
        candidates: votingCandidates,
      });
    }

    return positions;
  } catch {
    return [];
  }
}

export async function submitApplication(
  data: Omit<CandidateApplicationData, "id" | "status" | "rejectionReason" | "adminNote" | "submittedDate" | "reviewedDate">
): Promise<CandidateApplicationData> {
  const result: any = await candidateApi.submit({
    name: data.name,
    enrollmentNumber: data.enrollmentNumber,
    department: data.department,
    year: data.year,
    section: data.section,
    position: data.position,
    email: data.email,
    phone: data.phone,
    photo: data.photo,
    bio: data.bio,
    manifesto: data.manifesto,
  });
  return result?.data || result;
}

/**
 * Admin review action on a candidate application. Hits the REAL backend
 * endpoints (approve/reject/request-changes); the old code called a
 * nonexistent /candidates/:id/status route, so actions silently failed.
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  rejectionReason?: string,
  context?: { electionId?: number | string; constituencyId?: number | string }
): Promise<CandidateApplicationData> {
  let result: any;
  if (status === "approved") {
    result = await candidateApi.approveApplication(id, context);
  } else if (status === "rejected") {
    result = await candidateApi.rejectApplication(id, rejectionReason || "Application rejected");
  } else if (status === "changes_requested") {
    result = await candidateApi.requestApplicationChanges(id, rejectionReason || "Changes requested");
  } else {
    throw new Error(`Unsupported status transition: ${status}`);
  }
  const app: any = result?.application || result?.data || result;
  const isCR = app?.category !== "CLUB";
  const seatLine = seatLabel(app?.department, app?.year, app?.section);
  return {
    id: String(app?.id ?? id),
    name: app?.fullName || "—",
    enrollmentNumber: app?.enrollmentNumber || "—",
    department: app?.department || "—",
    year: app?.year || "—",
    section: app?.section || "",
    position: isCR
      ? seatLine || "Class Representative"
      : app?.position || app?.contestingPosition || "—",
    email: app?.email || "—",
    phone: app?.phone || "—",
    photo: app?.profilePhotoUrl || null,
    bio: app?.bio || "",
    manifesto: app?.manifesto || "",
    gender: app?.gender || "",
    status: (app?.status || status) as CandidateApplicationData["status"],
    rejectionReason: app?.rejectionReason ?? null,
    adminNote: app?.changesRequestedReason ?? null,
    submittedDate: app?.submittedAt || null,
    reviewedDate: app?.reviewedAt || null,
    category: (app?.category === "CLUB" ? "CLUB" : "CR") as "CLUB" | "CR",
    electionId: app?.electionId ?? null,
    constituencyId: app?.constituencyId ?? null,
  };
}

/**
 * Place an already-approved CR application onto its ballot.
 * POST /api/v1/admin/candidate-applications/:id/assign-ballot
 */
export async function assignApplicationToBallot(
  id: string,
  context?: { electionId?: number | string; constituencyId?: number | string }
): Promise<void> {
  await candidateApi.assignBallot(id, context);
}
