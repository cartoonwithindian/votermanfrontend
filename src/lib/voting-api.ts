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
  id: string;
  name: string;
  status: string; // OPEN | SCHEDULED | CLOSED | DRAFT | PUBLISHED
  startTime: string | null;
  endTime: string | null;
  description?: string | null;
}

export interface BallotCandidate {
  id: string;
  name: string;
  description: string;
  photo: string | null;
}

export interface BallotPosition {
  id: string;
  constituencyId: string;
  name: string;
  description: string;
  order: number;
  candidates: BallotCandidate[];
}

export interface BallotSelections {
  positionId: string;
  candidateId: string;
}

export interface VoteReceipt {
  receiptId: string | null;
  receiptHash: string;
  nullifier: string | null;
  createdAt: string;
}

interface ElectionRow {
  id: number | string;
  name: string;
  status: string;
  start_time: string | null;
  end_time: string | null;
  description?: string | null;
}

interface PositionRow {
  id: number | string;
  constituency_id: number | string | null;
  name: string;
  description?: string | null;
  display_order?: number | null;
}

interface CandidateRow {
  id: number | string;
  name: string;
  description?: string | null;
  image_url?: string | null;
}

interface ConstituencyRow {
  id: number | string;
  election_id: number | string;
  department: string;
  year: string;
  section: string;
  name: string;
  is_active: boolean;
  voting_open?: boolean;
}

/** GET /elections - all elections. */
export async function listElections(): Promise<ElectionInfo[]> {
  const rows = await api.get<ElectionRow[]>("/elections");
  return (rows || []).map((e) => ({
    id: String(e.id),
    name: e.name || "",
    status: e.status,
    startTime: e.start_time || null,
    endTime: e.end_time || null,
    description: e.description ?? null,
  }));
}

/** Find the election currently accepting votes (status OPEN).
 *  Deterministic: if multiple OPEN elections exist, the most recently
 *  opened one wins, so a freshly configured ballot is preferred over a
 *  stale one that has no seats. */
export async function findOpenElection(): Promise<ElectionInfo | null> {
  const list = await listElections();
  const open = (list || []).filter((e) => e.status === "OPEN");
  if (open.length === 0) return null;
  open.sort((a, b) => {
    const at = Date.parse(a.startTime || "") || 0;
    const bt = Date.parse(b.startTime || "") || 0;
    return bt - at || String(b.id).localeCompare(String(a.id));
  });
  return open[0] || null;
}

/**
 * Find the election to vote in for the current student's class. Tries each
 * open election (most recent first) and returns the first one whose
 * my-constituency resolves to a non-empty set of positions, so a class with
 * seats in an older election isn't shown an empty newer one. When no open
 * election has a ballot for this class, falls back to the most recent open
 * election so the caller can show an "open but nothing for your class" state.
 */
export async function findElectionWithBallot(): Promise<ElectionInfo | null> {
  const list = await listElections();
  const open = (list || []).filter((e) => e.status === "OPEN");
  open.sort((a, b) => {
    const at = Date.parse(a.startTime || "") || 0;
    const bt = Date.parse(b.startTime || "") || 0;
    return bt - at || String(b.id).localeCompare(String(a.id));
  });
  let fallback: ElectionInfo | null = null;
  for (const election of open) {
    try {
      const ballot = await fetchBallot(election.id);
      if (ballot.positions.length > 0) return election;
      if (!fallback) fallback = election;
    } catch {
      // Try the next open election if this one errored/failed to resolve.
    }
  }
  return fallback;
}

/**
 * Compose the live ballot: only the authenticated student's own Class
 * Representative seats (constituency -> its CR positions -> candidates).
 * The backend resolves the student's constituency by department/year/section,
 * so BCA 1st Year Section A sees only its Boy CR + Girl CR candidates —
 * never other sections or club positions. Positions with no active
 * candidates are omitted.
 */
export async function fetchBallot(
  electionId: string
): Promise<{ positions: BallotPosition[]; exists: boolean; votingOpen: boolean }> {
  const out: BallotPosition[] = [];

  // The student's own CR seat (backend resolves by department/year/section).
  // Real failures (401/403/500/network) must not be swallowed into an
  // empty ballot - let them propagate so callers can show "sign in
  // required" or a genuine error instead of a misleading "no positions".
  const { constituency } = await api.get<{ constituency: ConstituencyRow | null }>(
    `/elections/${electionId}/votes/my-constituency`
  );

  if (!constituency) {
    // Legitimate empty: the student has no class-representative seat in
    // this election (backend returns 200 {constituency:null}).
    return { positions: out, exists: false, votingOpen: false };
  }

  const positions = await api.get<PositionRow[]>(`/constituencies/${constituency.id}/positions`);
  for (const pos of positions || []) {
    if (!pos || !pos.id) continue;
    let candidates: CandidateRow[];
    try {
      candidates = await api.get<CandidateRow[]>(`/positions/${pos.id}/candidates`);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) throw err;
      continue; // one broken position must not blank the whole ballot
    }
    const mapped: BallotCandidate[] = (candidates || []).map((c) => ({
      id: String(c.id),
      name: c.name || "",
      description: c.description || "",
      photo: c.image_url || null,
    }));
    if (mapped.length === 0) continue;
    out.push({
      id: String(pos.id),
      constituencyId: String(constituency.id),
      name: pos.name || "",
      description: pos.description || "",
      order: Number(pos.display_order) || out.length,
      candidates: mapped,
    });
  }

  out.sort((a, b) => a.order - b.order);
  return { positions: out, exists: true, votingOpen: constituency.voting_open !== false };
}

/**
 * GET /elections/:id/votes/check - which positions this student already voted.
 * Pass the ballot position ids to learn whether any remain.
 */
export async function checkVoted(
  electionId: string,
  positionIds?: string[]
): Promise<{ voted: string[]; canVote: boolean }> {
  const qs = positionIds && positionIds.length > 0
    ? `?position_ids=${positionIds.join(",")}`
    : "";
  const data = await api.get<{ voted_positions?: (number | string)[]; can_vote?: boolean }>(
    `/elections/${electionId}/votes/check${qs}`
  );
  return {
    voted: (data?.voted_positions || []).map(String),
    canVote: data?.can_vote !== false,
  };
}

/** POST /elections/:id/votes - cast one Class Representative vote
 *  (one per position), scoped to the student's constituency. */
export async function castVote(
  electionId: string,
  constituencyId: string | undefined,
  positionId: string,
  candidateId: string
): Promise<VoteReceipt> {
  const data = await api.post<{ receipt?: VoteReceipt }>(`/elections/${electionId}/votes`, {
    election_id: electionId,
    ...(constituencyId !== undefined ? { constituency_id: constituencyId } : {}),
    position_id: positionId,
    candidate_id: candidateId,
  });
  const r = data?.receipt;
  return {
    receiptId: r?.receiptId != null ? String(r.receiptId) : null,
    receiptHash: r?.receiptHash || "",
    nullifier: r?.nullifier || null,
    createdAt: r?.createdAt || "",
  };
}

export interface SubmitBallotResult {
  success: boolean;
  count: number;
  receipts: VoteReceipt[];
}

/** POST /elections/:id/votes/ballot - submit the entire ballot atomically.
 *  All selections succeed together or none are stored (DB transaction /
 *  no-partial on the backend). Duplicate-vote races surface as 409. */
export async function submitBallot(
  electionId: string,
  constituencyId: string,
  selections: BallotSelections[]
): Promise<SubmitBallotResult> {
  const data = await api.post<{ data?: { success?: boolean; count?: number; receipts?: VoteReceipt[] } }>(
    `/elections/${electionId}/votes/ballot`,
    {
      constituency_id: constituencyId,
      selections: selections.map((s) => ({
        positionId: s.positionId,
        candidateId: s.candidateId,
      })),
    }
  );
  return {
    success: data?.data?.success !== false,
    count: data?.data?.count ?? selections.length,
    receipts: data?.data?.receipts || [],
  };
}

/** GET /elections/:id/votes/receipt - my receipt for an election (may 404). */
export async function getMyElectionReceipt(
  electionId: string
): Promise<VoteReceipt | null> {
  try {
    const data = await api.get<{ receipt?: VoteReceipt }>(
      `/elections/${electionId}/votes/receipt`
    );
    const r = data?.receipt;
    if (!r) return null;
    return {
      receiptId: r.receiptId != null ? String(r.receiptId) : null,
      receiptHash: r.receiptHash || "",
      nullifier: r.nullifier || null,
      createdAt: r.createdAt || "",
    };
  } catch {
    return null; // no receipt yet for this election
  }
}

export interface PublicReceipt {
  receiptId: string | null;
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
        receiptId: r.receiptId != null ? String(r.receiptId) : null,
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
