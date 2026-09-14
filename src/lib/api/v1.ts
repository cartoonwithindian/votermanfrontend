// Typed client for the VoteWeb API served by voteweb-backend.
// Endpoints & payload shapes mirror the Express backend in /voteweb-backend
// (mount prefix /api/v1, session cookie `cv_sid`).
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

export class V1ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "V1ApiError";
    this.status = status;
  }
}

export interface CurrentUser {
  id: number;
  studentId: number;
  externalId: string;
  userIdentifier: string;
  name: string;
  fullName: string;
  email: string;
  rollNumber?: string | null;
  department?: string | null;
  year?: string | null;
  section?: string | null;
  role: "STUDENT" | "CANDIDATE" | "ADMIN" | "CAD";
  passwordChangeRequired: boolean;
  mfaEnabled: boolean;
  mfaVerified: boolean;
  sessionId: number;
  sessionCreatedAt: string;
  sessionExpiresAt: string;
}

export type ElectionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "OPEN"
  | "CLOSED"
  | "PUBLISHED";

export interface ElectionV1 {
  id: number;
  name: string;
  description: string | null;
  status: ElectionStatus;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementV1 {
  id: number;
  election_id: number | null;
  title: string;
  message: string;
  audience: string;
  priority: "low" | "normal" | "high" | "urgent" | string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    });
  } catch {
    throw new V1ApiError("Unable to reach the VoteWeb API.", 0);
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (body as { message?: string; error?: string }).message ||
      (body as { error?: string }).error ||
      `Request failed (HTTP ${res.status})`;
    throw new V1ApiError(msg, res.status);
  }

  return body as T;
}

function toQuery(params: Record<string, string | number | undefined>) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

/** GET /api/v1/auth/me - current session (unauthenticated => authenticated: false). */
export async function getMe(): Promise<{
  authenticated: boolean;
  user: CurrentUser | null;
}> {
  const json = await request<{ data: { authenticated: boolean; user: CurrentUser | null } }>("/auth/me");
  return json.data;
}

/** GET /api/v1/elections - public list of elections (optional status filter). */
export async function listElections(status?: ElectionStatus): Promise<ElectionV1[]> {
  const json = await request<{ data: ElectionV1[] }>(`/elections${toQuery({ status })}`);
  return json.data;
}

/** GET /api/v1/announcements - published announcements (public). */
export async function listAnnouncements(limit = 5): Promise<AnnouncementV1[]> {
  const json = await request<{ data: AnnouncementV1[] }>(
    `/announcements${toQuery({ limit })}`
  );
  return json.data;
}
