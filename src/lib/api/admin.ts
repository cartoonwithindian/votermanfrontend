import { api } from "./client";

export interface AdminStats {
  students: { total: number; active: number; voting_eligible: number };
  elections: { total: number; open: number; published: number };
  candidates: { total: number };
  votes: { total: number; unique_voters: number };
  accessRequests: { total: number; pending: number };
  pendingCandidateApplications: number;
  generatedAt: string;
}

export interface LiveLeaderboardEntry {
  candidate_id: number;
  candidate_name: string;
  position_name: string;
  election_id: number;
  election_name: string;
  scope_name: string | null;
  votes: number;
}

export interface LiveSnapshot {
  stats: Omit<AdminStats, "generatedAt">;
  leaderboard: LiveLeaderboardEntry[];
  generatedAt: string;
}

export interface MonitoringSummary {
  status: "healthy" | "degraded";
  generatedAt: string;
  metricsEnabled: boolean;
  uptimeSeconds: number;
  nodeVersion: string;
  process: {
    cpuPercent: number | null;
    memoryRssBytes: number;
    heapUsedBytes: number;
    heapTotalBytes: number;
  };
  http: {
    requestsTotal: number;
    requestsPerSecond: number;
    active: number;
    averageDurationMs: number;
    samples: number;
    errorCount: number;
    errorRatePct: number;
  };
  database: {
    connected: boolean;
    total: number;
    idle: number;
    waiting: number;
  };
  business: {
    activeElections: number;
    registeredStudents: number;
    votesCast: number;
    candidateApplications: number;
    loginAttempts: number;
    failedLogins: number;
  };
}

export interface AdminStudentRecord {
  id: number;
  student_id: string | null;
  name: string;
  email: string | null;
  role: string;
  is_active: boolean;
  voting_eligible?: boolean;
  department?: string | null;
  year_or_semester?: string | null;
  section?: string | null;
  /** Pre-fill source from the student's Class Representative application. */
  applied_department?: string | null;
  applied_year?: string | null;
  applied_section?: string | null;
}

export interface AdminElectionRecord {
  id: number;
  name: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
}

export interface AdminPositionRecord {
  id: number;
  club_id: number | null;
  constituency_id: number | null;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export interface AdminConstituencyRecord {
  id: number;
  election_id: number;
  department: string;
  year: string;
  section: string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

export interface AdminAnnouncementRecord {
  id: number;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

export interface SupportRequestRecord {
  id: number;
  subject?: string;
  category?: string;
  message?: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AuditLogRecord {
  id: number;
  action: string;
  user_name: string | null;
  user_role: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/**
 * All admin data access — REAL backend endpoints only (no mock data).
 * The api client handles cookies, CSRF tokens and session binding.
 */
export const adminApi = {
  // Real-time statistics (GET /admin/stats)
  getStats: () => api.get<AdminStats>("/admin/stats"),

  // Real-time dashboard snapshot with leaderboard (GET /admin/live)
  getLive: () => api.get<LiveSnapshot>("/admin/live"),

  // System monitoring summary (GET /admin/monitoring — aggregate only)
  getMonitoring: () => api.get<MonitoringSummary>("/admin/monitoring"),

  // Students (GET /admin/students)
  getStudents: () => api.get<{ students?: AdminStudentRecord[] } | AdminStudentRecord[]>("/admin/students"),

  // Update a student (PATCH /admin/students/:id) — voting eligibility + role management
  updateStudent: (id: number, patch: { voting_eligible?: boolean; role?: string; name?: string; email?: string | null; department?: string; year_or_semester?: string; section?: string | null }) =>
    api.patch<{ data: AdminStudentRecord }>(`/admin/students/${id}`, patch),

  // Elections (GET /admin/elections)
  getElections: () => api.get<{ elections?: AdminElectionRecord[] } | AdminElectionRecord[]>("/admin/elections"),

  // Announcements (GET /admin/announcements)
  getAnnouncements: () =>
    api.get<{ announcements?: AdminAnnouncementRecord[] } | AdminAnnouncementRecord[]>("/admin/announcements"),

  // Support issues (GET /admin/support — the backend does NOT serve /admin/issues)
  getIssues: () => api.get<{ requests?: SupportRequestRecord[] } | SupportRequestRecord[]>("/admin/support"),

  // Audit log (GET /admin/audit-logs)
  getAuditLogs: () => api.get<{ logs: AuditLogRecord[] }>("/admin/audit-logs"),

  // Student access requests
  getAccessRequests: (status?: string) =>
    api.get<{ requests: unknown[]; counts: Record<string, number> }>(
      `/admin/access-requests${status ? `?status=${status}` : ""}`
    ),

  // Live election results (same read-only results service CAD uses)
  getElectionResults: (electionId: number) => api.get(`/cad/elections/${electionId}/results`),
  getMonitorElections: () => api.get<{ elections: Array<{ id: number; name: string; status: string }> }>("/cad/elections"),

  // Announcements management (admin CRUD)
  createAnnouncement: (body: { title: string; message: string; audience: string; priority?: string; is_published: boolean; election_id?: number | null }) =>
    api.post("/admin/announcements", body),
  updateAnnouncement: (id: number | string, body: { title?: string; message?: string; audience?: string; priority?: string; is_published?: boolean }) =>
    api.patch(`/admin/announcements/${id}`, body),
  deleteAnnouncement: (id: number | string) => api.delete(`/admin/announcements/${id}`),

  // Support request management
  updateSupportRequest: (id: number | string, body: { status?: string; priority?: string; response?: string; assigned_to?: string | null }) =>
    api.patch(`/admin/support/${id}`, body),

  // Publish election results (real endpoint)
  publishElectionResults: (electionId: number | string) => api.post(`/admin/elections/${electionId}/publish`, {}),

  // ---- Election management (real /admin/elections CRUD) ----
  createElection: (body: { name: string; description?: string; start_time?: string; end_time?: string }) =>
    api.post<{ data: AdminElectionRecord }>("/admin/elections", body),
  updateElection: (id: number | string, body: { name?: string; description?: string; start_time?: string; end_time?: string }) =>
    api.patch<{ data: AdminElectionRecord }>(`/admin/elections/${id}`, body),
  updateElectionStatus: (id: number | string, status: string) =>
    api.patch(`/admin/elections/${id}/status`, { status }),
  getReadiness: (id: number | string) => api.get<Record<string, unknown>>(`/admin/elections/${id}/readiness`),

  // ---- Positions management (real /admin/positions + /positions) ----
  getPositions: () => api.get<{ data: AdminPositionRecord[] } | AdminPositionRecord[]>("/positions?active_only=false"),
  updatePosition: (id: number | string, body: { name?: string; description?: string; display_order?: number }) =>
    api.patch(`/admin/positions/${id}`, body),

  // ---- Class Representative constituencies (real /constituencies + /admin/constituencies) ----
  getConstituencies: (electionId: number | string) =>
    api.get<{ data: AdminConstituencyRecord[] }>(`/constituencies?election_id=${electionId}&active_only=false`),
  createConstituency: (body: { election_id: number | string; department: string; year: string; section: string; name?: string }) =>
    api.post<{ data: AdminConstituencyRecord }>("/admin/constituencies", body),
  updateConstituency: (id: number | string, body: { name?: string; is_active?: boolean }) =>
    api.patch<{ data: AdminConstituencyRecord }>(`/admin/constituencies/${id}`, body),
  deleteConstituency: (id: number | string) =>
    api.delete(`/admin/constituencies/${id}`),
};
