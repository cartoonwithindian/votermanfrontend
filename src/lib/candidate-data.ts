"use client";

// Candidate data types for CampusVote
// These types match the backend candidate_applications table

export type CandidateGender = "Male" | "Female" | "Other";

export type CandidatePosition =
  | "President"
  | "Vice President"
  | "General Secretary"
  | "Treasurer"
  | "Cultural Secretary"
  | "Class Representative";

export type CandidateDepartment =
  | "BCA"
  | "BBA"
  | "MCA"
  | "MBA"
  | "BCom"
  | "B.Tech"
  | "B.Com"
  | "Economics"
  | "Fine Arts"
  | "Mass Communication"
  | "Other";

export type CandidateYear =
  | "1st Year"
  | "2nd Year"
  | "3rd Year"
  | "4th Year";

export interface ManifestoSection {
  title: string;
  content: string;
}

export interface Candidate {
  id: string;
  name: string;
  // Position is internal/election data - NOT shown as filter on student page
  position: CandidatePosition;
  department: CandidateDepartment;
  year: CandidateYear;
  // Gender is what students filter by (Female->Girls, Male->Boys)
  gender: CandidateGender;
  section?: string;
  photoInitials: string;
  campaignSymbol: string;
  verified: boolean;
  biography: string;
  manifestos: ManifestoSection[];
  profilePhotoUrl?: string;
  electionName?: string;
  // Approval status for internal use
  status?: string;
}

// Empty array - no mock data. Real data comes from backend API.
export const CANDIDATES: Candidate[] = [];
