"use client";

// Typed client for the real VoteWeb voting + receipt endpoints
// (voteweb-backend, mounted at /api/v1). Replaces the in-memory vote-store
// and localStorage candidate mocks used by the voting flow.

import { api } from "@/lib/api/client";
import type { VotingPosition, VotingCandidate } from "@/lib/election-voting-data";

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"
).replace(/\/$/, "");

export interface ElectionInfo {
  id: number;
  name: string;
  status: string; // OPEN | SCHEDULED | CLOSED | DRAFT | PUBLISHED
  startTime: string | null;
  endTime: string | null;
  description?: string | null;
}

export interface BallotCandidate {
  id: number;
  name: string;
  description: string;
  photo: string | null;
}

export interface BallotPosition {
  id: number;
  clubId?: number;
  clubName?: string;
  constituencyId?: number;
  name: string;
  description: string;
  order: number;
  candidates: BallotCandidate[];
}

export interface VoteReceipt {
  receiptId: number | null;
  receiptHash: string;
  nullifier: string | null;
  createdAt: string;
}

interface ElectionRow {
  id: number;
  name: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  description?: string | null;
}

interface ClubRow {
  id: number;
  name: string;
}

interface PositionRow {
  id: number;
  club_id: number | null;
  constituency_id: number | null;
  name: string;
  description?: string | null;
  display_order?: number | null;
}

interface CandidateRow {
  id: number;
  name: string;
  description?: string | null;
  image_url?: string | null;
}

interface ConstituencyRow {
  id: number;
  election_id: number;
  department: string;
  year: string;
  section: string;
  name: string;
  is_active: boolean;
}

/** GET /elections - all elections. */
export async function listElections(): Promise<ElectionInfo[]> {
  const rows = await api.get<ElectionRow[]>("/elections");
  return (rows || []).map((e) => ({
    id: Number(e.id),
    name: e.name || "",
    status: e.status,
    startTime: e.start_time || null,
    endTime: e.end_time || null,
    description: e.description ?? null,
  }));
}

/** Find the election currently accepting votes (status OPEN). */
export async function findOpenElection(): Promise<ElectionInfo | null> {
  const list = await listElections();
  return list.find((e) => e.status === "OPEN") || null;
}

/**
 * Compose the live ballot: election clubs -> positions -> candidates, plus
 * the authenticated student's own Class Representative seat (constituency ->
 * its CR position -> candidates). Positions with no active candidates are
 * omitted. Club and CR positions are ordered together by display_order.
 */
export async function fetchBallot(electionId: number): Promise<BallotPosition[]> {
  const clubs = await api.get<ClubRow[]>(`/elections/${electionId}/clubs`);
  const out: BallotPosition[] = [];

  for (const club of clubs || []) {
    const positions = await api.get<PositionRow[]>(`/clubs/${club.id}/positions`);
    for (const pos of positions || []) {
      const candidates = await api.get<CandidateRow[]>(`/positions/${pos.id}/candidates`);
      const mapped: BallotCandidate[] = (candidates || []).map((c) => ({
        id: Number(c.id),
        name: c.name || "",
        description: c.description || "",
        photo: c.image_url || null,
      }));
      if (mapped.length === 0) continue;
      out.push({
        id: Number(pos.id),
        clubId: Number(club.id),
        clubName: club.name || "",
        name: pos.name || "",
        description: pos.description || "",
        order: Number(pos.display_order) || out.length,
        candidates: mapped,
      });
    }
  }

  // The student's own CR seat (backend resolves by department/year/section).
  try {
    const { constituency } = await api.get<{ constituency: ConstituencyRow | null }>(
      `/elections/${electionId}/votes/my-constituency`
    );
    if (constituency) {
      const positions = await api.get<PositionRow[]>(`/constituencies/${constituency.id}/positions`);
      for (const pos of positions || []) {
        const candidates = await api.get<CandidateRow[]>(`/positions/${pos.id}/candidates`);
        const mapped: BallotCandidate[] = (candidates || []).map((c) => ({
          id: Number(c.id),
          name: c.name || "",
          description: c.description || "",
          photo: c.image_url || null,
        }));
        if (mapped.length === 0) continue;
        out.push({
          id: Number(pos.id),
          constituencyId: Number(constituency.id),
          name: pos.name || "",
          description: pos.description || "",
          order: Number(pos.display_order) || out.length,
          candidates: mapped,
        });
      }
    }
  } catch {
    // Non-fatal: students without a CR seat (or without a section on file)
    // simply see the club positions.
  }

  out.sort((a, b) => a.order - b.order);
  return out;
}

/**
 * GET /elections/:id/votes/check - which positions this student already voted.
 * Pass the ballot position ids to learn whether any remain.
 */
export async function checkVoted(
  electionId: number,
  positionIds?: number[]
): Promise<{ voted: number[]; canVote: boolean }> {
  const qs = positionIds && positionIds.length > 0
    ? `?position_ids=${positionIds.join(",")}`
    : "";
  const data = await api.get<{ voted_positions?: number[]; can_vote?: boolean }>(
    `/elections/${electionId}/votes/check${qs}`
  );
  return {
    voted: data?.voted_positions || [],
    canVote: data?.can_vote !== false,
  };
}

/** POST /elections/:id/votes - cast one vote (one per position). Pass
 *  clubId for a club seat or constituencyId for a Class Representative seat. */
export async function castVote(
  electionId: number,
  clubId: number | undefined,
  constituencyId: number | undefined,
  positionId: number,
  candidateId: number
): Promise<VoteReceipt> {
  const data = await api.post<{ receipt?: VoteReceipt }>(`/elections/${electionId}/votes`, {
    election_id: electionId,
    ...(clubId !== undefined ? { club_id: clubId } : {}),
    ...(constituencyId !== undefined ? { constituency_id: constituencyId } : {}),
    position_id: positionId,
    candidate_id: candidateId,
  });
  const r = data?.receipt;
  return {
    receiptId: r?.receiptId != null ? Number(r.receiptId) : null,
    receiptHash: r?.receiptHash || "",
    nullifier: r?.nullifier || null,
    createdAt: r?.createdAt || "",
  };
}

/** GET /elections/:id/votes/receipt - my receipt for an election (may 404). */
export async function getMyElectionReceipt(
  electionId: number
): Promise<VoteReceipt | null> {
  try {
    const data = await api.get<{ receipt?: VoteReceipt }>(
      `/elections/${electionId}/votes/receipt`
    );
    const r = data?.receipt;
    if (!r) return null;
    return {
      receiptId: r.receiptId != null ? Number(r.receiptId) : null,
      receiptHash: r.receiptHash || "",
      nullifier: r.nullifier || null,
      createdAt: r.createdAt || "",
    };
  } catch {
    return null; // no receipt yet for this election
  }
}

export interface PublicReceipt {
  receiptId: number | null;
  receiptHash: string;
  electionName: string;
  electionStatus: string;
  votedAt: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

// Convert a real ballot into the VotingPosition shape used by the voting UI.
export function mapBallotToVotingPositions(
  ballot: BallotPosition[]
): VotingPosition[] {
  return ballot.map((p, index) => ({
    id: String(p.id),
    name: p.name,
    order: index,
    clubId: p.clubId,
    constituencyId: p.constituencyId,
    candidates: p.candidates.map((c): VotingCandidate => ({
      id: String(c.id),
      name: c.name,
      department: "",
      year: "",
      photoInitials: initialsOf(c.name),
      photo: c.photo,
      campaignSymbol: "",
      shortManifesto: c.description,
    })),
  }));
}

/** GET /receipts/:id - public receipt verification (no auth required). */
export async function verifyReceiptPublic(
  receiptId: string
): Promise<{ valid: boolean; receipt: PublicReceipt | null }> {
  try {
    const res = await fetch(`${API_BASE}/receipts/${encodeURIComponent(receiptId)}`, {
      credentials: "include",
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.valid !== true) return { valid: false, receipt: null };
    const r = body.receipt || {};
    return {
      valid: true,
      receipt: {
        receiptId: r.receiptId != null ? Number(r.receiptId) : null,
        receiptHash: r.receiptHash || "",
        electionName: r.electionName || "",
        electionStatus: r.electionStatus || "",
        votedAt: r.votedAt || "",
      },
    };
  } catch {
    return { valid: false, receipt: null };
  }
}
