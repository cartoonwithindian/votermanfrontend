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

/**
 * Downscale an image file via canvas (max `max` px on the long edge, JPEG
 * ~85%) and return a base64 data-URL. Keeps the upload well under the
 * backend's 1MB JSON body limit and the Appwrite bucket's 2MB file limit —
 * a 512px JPEG lands in the ~30-80KB range.
 */
export async function downscaleImageToDataUrl(file: File, max = 512): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image."));
    image.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl; // Canvas unavailable — fall back to the original data URL.
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

// CSRF token for the /api/v1/uploads endpoint (double-submit cookie `cv_csrf`).
let uploadsCsrfToken: string | null = null;

async function getUploadsCsrfToken(): Promise<string> {
  if (uploadsCsrfToken !== null && uploadsCsrfToken !== "") return uploadsCsrfToken;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    const token: string = data?.data?.csrfToken || "";
    uploadsCsrfToken = token;
    if (token && typeof document !== "undefined") {
      document.cookie = `cv_csrf=${encodeURIComponent(token)}; path=/; SameSite=Lax; max-age=3600`;
    }
    return token;
  } catch {
    return "";
  }
}

/**
 * POST /api/v1/uploads/photo — upload a base64 data-URL to the Appwrite
 * `candidate-photos` bucket via the backend. Returns the public URL to use
 * as `profilePhotoUrl`.
 */
export async function uploadCandidatePhoto(
  dataUrl: string
): Promise<{ url: string; fileId: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const csrf = await getUploadsCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;
  const binding = bindingToken();
  if (binding) headers["X-Session-Binding"] = binding;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/uploads/photo`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify({ image: dataUrl }),
    });
  } catch {
    throw new CandidateApiError("Could not reach the server to upload the photo.", 0);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CandidateApiError(body?.message || `Photo upload failed (HTTP ${res.status})`, res.status);
  }
  return body.data as { url: string; fileId: string };
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