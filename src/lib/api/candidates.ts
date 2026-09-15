import { api } from "./client";
import type { ApplicationStatus } from "../candidate-dashboard-data";

export interface CandidateApplication {
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
  status: ApplicationStatus;
  rejectionReason: string | null;
  adminNote: string | null;
  submittedDate: string | null;
  reviewedDate: string | null;
  category: "CLUB" | "CR";
  electionId: number | null;
  constituencyId: number | null;
}

export interface SubmitApplicationPayload {
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
}

export interface UpdateStatusPayload {
  status: ApplicationStatus;
  reason?: string;
  note?: string;
}

export const candidateApi = {
  getApplication: (id: string) => api.get<CandidateApplication>(`/candidates/${id}`),
  getMyApplication: () => api.get<CandidateApplication>("/candidates/me"),
  getAll: () => api.get<CandidateApplication[]>("/candidates"),
  getApproved: () => api.get<CandidateApplication[]>("/candidates/approved"),
  submit: (data: SubmitApplicationPayload) => api.post<CandidateApplication>("/candidates", data),
  update: (id: string, data: Partial<SubmitApplicationPayload>) => api.put<CandidateApplication>(`/candidates/${id}`, data),

  // ---- Admin review of candidate APPLICATIONS ----
  // Real endpoints: /api/v1/admin/candidate-applications (the /candidates/:id/status
  // route never existed — approvals were failing silently before this fix).
  listApplications: () =>
    api.get<{ success: boolean; candidates: unknown[]; count: number }>("/admin/candidate-applications"),
  approveApplication: (id: string, context?: { electionId?: number | string; constituencyId?: number | string }) =>
    api.patch<{ success: boolean; application: unknown }>(`/admin/candidate-applications/${id}/approve`, context || {}),
  rejectApplication: (id: string, reason: string) =>
    api.patch<{ success: boolean; application: unknown }>(`/admin/candidate-applications/${id}/reject`, { reason }),
  requestApplicationChanges: (id: string, reason: string) =>
    api.patch<{ success: boolean; application: unknown }>(`/admin/candidate-applications/${id}/request-changes`, { reason }),
  assignBallot: (id: string, context?: { electionId?: number | string; constituencyId?: number | string }) =>
    api.post<{ success: boolean; application: unknown }>(`/admin/candidate-applications/${id}/assign-ballot`, context || {}),

  getPositions: () => api.get<string[]>("/candidates/positions"),
  getDepartments: () => api.get<string[]>("/candidates/departments"),
};
