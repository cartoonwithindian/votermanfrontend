import { api } from "./client";

export interface StudentProfile {
  id: string;
  name: string;
  email: string | null;
  enrollmentNumber: string | null;
  department: string | null;
  year: string | null;
  section: string | null;
  phone: string | null;
  avatar: string | null;
  role?: string | null;
  isActive?: boolean;
  votingEligible?: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  voteReminders: boolean;
  resultAnnouncements: boolean;
  systemUpdates: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

export interface MyCandidacy {
  id: string;
  name: string;
  position_id: string | null;
  position_name: string | null;
  department: string | null;
  year: string | null;
  section: string | null;
  gender: string | null;
  image_url: string | null;
  manifesto: string;
}

export const studentApi = {
  getProfile: () => api.get<StudentProfile>("/students/profile"),
  updateProfile: (data: Partial<StudentProfile> & { profileImageUrl?: string | null; avatar?: string | null }) =>
    api.patch<StudentProfile>("/students/profile", data),
  uploadProfileImage: (dataUrl: string) =>
    // Uses same Appwrite bucket but folder "profiles/" — education pack
    api.post<{ url: string; fileId: string; bucketId: string; folder: string }>("/uploads/profile", {
      image: dataUrl,
    }),
  getNotificationSettings: () => api.get<NotificationSettings>("/students/notifications/settings"),
  updateNotificationSettings: (data: Partial<NotificationSettings>) => api.put("/students/notifications/settings", data),
  getActiveSessions: () => api.get<ActiveSession[]>("/students/sessions"),
  deleteSession: (id: string) => api.delete(`/students/sessions/${id}`),
  getMyCandidacy: () => api.get<MyCandidacy>("/students/me/candidacy"),
  updateMyManifesto: (manifesto: string) =>
    api.patch<MyCandidacy>("/students/me/candidacy", { manifesto }),
};
