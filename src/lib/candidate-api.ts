"use client";

// Real backend client for the candidate application workflow.
// Endpoints mount at /api/candidates (note: NOT /api/v1/candidates).
// GETs need the session cookie; POST/PATCH need X-Session-Binding (enforced
// by loadSession for state-changing requests).

import type { ApplicationStatus } from "@/lib/candidate-dashboard-data";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "");
// Strip the /api/v1 suffix -> /api/candidates
const CANDIDATE_BASE = `${API_BASE.replace(/\/api\/v1$/, "")}/api/candidates`;

export interface CandidateApplication {
  id: number;
  studentId: number;
  fullName: string;
  enrollmentNumber: string;
  department: string;
  year: string;
  semester: string | null;
  section: string | null;
  positionId: number | null;
  positionName: string | null;
  nominationClub: string | null;
  contestingPosition: string | null;
  category: string;
  electionId: number | null;
  email: string;
  phone: string;
  profilePhotoUrl: string | null;
  bio: string | null;
  manifesto: string | null;
  age: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  aadharNumber: string | null;
  status: string;
  rejectionReason: string | null;
  changesRequestedReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

/** The shape the candidate UI components consume. */
export interface CandidateApplicationData {
  id: string;
  name: string;
  enrollmentNumber: string;
  department: string;
  year: string;
  section: string;
  position: string;
  nominationClub: string | null;
  contestingPosition: string | null;
  category: string;
  electionId: number | null;
  email: string;
  phone: string;
  photo: string | null;
  bio: string;
  manifesto: string;
  age: number | null;
  dateOfBirth: string | null;
  gender: string | null;
  aadharNumber: string | null;
  status: ApplicationStatus;
  rejectionReason: string | null;
  adminNote: string | null;
  submittedDate: string | null;
  reviewedDate: string | null;
}

export interface CandidateAccess {
  status: string | null;
  isApproved: boolean;
  canAccessCandidatePortal: boolean;
  hasApplication: boolean;
}

export interface PositionOption {
  id: number;
  name: string;
}

class CandidateApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CandidateApiError";
    this.status = status;
  }
}

function bindingToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem("campusvote_binding_token");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.method && ["POST", "PUT", "PATCH", "DELETE"].includes(options.method)) {
    const token = bindingToken();
    if (token) headers["X-Session-Binding"] = token;
  }

  const res = await fetch(`${CANDIDATE_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new CandidateApiError(data?.message || data?.error || `HTTP ${res.status}`, res.status);
  }

  return data as T;
}

/** GET /api/candidates/me/application — the current student's application (null if none). */
export async function getMyApplication(): Promise<CandidateApplicationData | null> {
  try {
    const data = await request<{ success: boolean; application: CandidateApplication }>(
      "/me/application"
    );
    if (!data?.application) return null;
    return mapApplication(data.application);
  } catch (err) {
    if (err instanceof CandidateApiError && (err.status === 404 || err.status === 401)) return null;
    throw err;
  }
}

/** GET /api/candidates/me/access — candidate portal access state. */
export async function getCandidateAccess(): Promise<CandidateAccess> {
  const data = await request<{ success: boolean; status: string | null; isApproved: boolean; canAccessCandidatePortal: boolean; hasApplication: boolean }>(
    "/me/access"
  );
  return {
    status: data.status ?? null,
    isApproved: !!data.isApproved,
    canAccessCandidatePortal: !!data.canAccessCandidatePortal,
    hasApplication: !!data.hasApplication,
  };
}

export interface SubmitApplicationPayload {
  fullName: string;
  enrollmentNumber: string;
  department: string;
  year: string;
  section?: string;
  category?: "CLUB" | "CR";
  electionId?: number | null;
  positionId?: number | null;
  nominationClub?: string;
  contestingPosition?: string;
  email: string;
  phone: string;
  profilePhotoUrl?: string | null;
  bio: string;
  manifesto: string;
  age: number;
  dateOfBirth: string;
  gender: string;
  aadharNumber: string;
}

/** POST /api/candidates/apply — submit a new application. */
export async function submitApplication(
  payload: SubmitApplicationPayload
): Promise<CandidateApplicationData> {
  const data = await request<{ success: boolean; application: CandidateApplication }>("/apply", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapApplication(data.application);
}

export interface ProfileUpdate {
  profilePhotoUrl?: string | null;
  bio?: string;
  manifesto?: string;
}

/** PATCH /api/candidates/me/profile — update bio/manifesto/photo (approved only). */
export async function updateMyProfile(update: ProfileUpdate): Promise<CandidateApplicationData> {
  const data = await request<{ success: boolean; application: CandidateApplication }>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify(update),
  });
  return mapApplication(data.application);
}

/** POST /api/candidates/me/resubmit — resubmit after changes_requested. */
export async function resubmitApplication(update: ProfileUpdate): Promise<CandidateApplicationData> {
  const data = await request<{ success: boolean; application: CandidateApplication }>("/me/resubmit", {
    method: "POST",
    body: JSON.stringify(update),
  });
  return mapApplication(data.application);
}

/** GET /api/v1/positions — available positions for the application form. */
export async function listPositions(): Promise<PositionOption[]> {
  const res = await fetch(`${API_BASE}/positions`, { credentials: "include" });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  const rows = data?.data || [];
  return rows.map((r: { id: number; name: string }) => ({
    id: Number(r.id),
    name: r.name || "",
  }));
}

/** Map a backend application row into the UI shape. */
export function mapApplication(app: CandidateApplication): CandidateApplicationData {
  return {
    id: String(app.id),
    name: app.fullName || "",
    enrollmentNumber: app.enrollmentNumber || "",
    department: app.department || "",
    year: app.year || "",
    section: app.section || "",
    position: app.contestingPosition || app.positionName || "",
    nominationClub: app.nominationClub || null,
    contestingPosition: app.contestingPosition || null,
    category: app.category || "CR",
    electionId: app.electionId ?? null,
    email: app.email || "",
    phone: app.phone || "",
    photo: app.profilePhotoUrl || null,
    bio: app.bio || "",
    manifesto: app.manifesto || "",
    age: app.age ?? null,
    dateOfBirth: app.dateOfBirth || null,
    gender: app.gender || null,
    aadharNumber: app.aadharNumber || null,
    status: (app.status as ApplicationStatus) || "draft",
    rejectionReason: app.rejectionReason || null,
    adminNote: app.changesRequestedReason || app.rejectionReason || null,
    submittedDate: app.submittedAt || null,
    reviewedDate: app.reviewedAt || null,
  };
}

export { CandidateApiError };