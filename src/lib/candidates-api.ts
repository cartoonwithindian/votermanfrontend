"use client";

// Typed client for the real candidates endpoints (voteweb-backend /api/v1).
// Maps backend rows onto the UI Candidate model used by the candidate pages.

import { api } from "@/lib/api/client";
import type { Candidate, CandidateGender, CandidatePosition, CandidateDepartment, CandidateYear } from "@/lib/candidate-data";

interface CandidateRow {
  id: number;
  student_id: number;
  name: string;
  gender: CandidateGender | null;
  department: string;
  year: string;
  section: string | null;
  description: string | null;
  image_url: string | null;
  position_id: number;
  position_name: string;
  election_id: number;
  election_name: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

function toCandidate(row: CandidateRow): Candidate {
  const bio = row.description || "";
  return {
    id: String(row.id),
    name: row.name || "",
    position: (row.position_name || "Other") as CandidatePosition,
    department: (row.department || "") as CandidateDepartment,
    year: (row.year || "") as CandidateYear,
    gender: row.gender || "Other",
    section: row.section || undefined,
    photoInitials: initialsOf(row.name),
    campaignSymbol: "",
    verified: false,
    biography: bio,
    manifestos: [],
    profilePhotoUrl: row.image_url || undefined,
  };
}

export interface ListCandidatesOptions {
  gender?: string;
  department?: string;
  year?: string;
  section?: string;
}

/** GET /candidates - all approved active candidates (public).
 *  Supports filtering by gender, department, year, section.
 */
export async function listCandidates(options?: ListCandidatesOptions): Promise<Candidate[]> {
  const queryParams = new URLSearchParams();

  if (options?.gender) queryParams.set('gender', options.gender);
  if (options?.department) queryParams.set('department', options.department);
  if (options?.year) queryParams.set('year', options.year);
  if (options?.section) queryParams.set('section', options.section);

  const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const rows = await api.get<CandidateRow[]>(`/candidates${query}`);
  return (rows || []).map(toCandidate);
}

/** GET /candidates/:id - single candidate (public). Returns null on miss. */
export async function getCandidate(id: string): Promise<Candidate | null> {
  try {
    const row = await api.get<CandidateRow>(`/candidates/${id}`);
    return row ? toCandidate(row) : null;
  } catch {
    return null;
  }
}

/** Fetch several candidates by id (used by the compare page). */
export async function getCandidatesByIds(ids: string[]): Promise<Candidate[]> {
  if (!ids.length) return [];
  const all = await listCandidates();
  const wanted = new Set(ids);
  return all.filter((c) => wanted.has(c.id));
}
