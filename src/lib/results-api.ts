/**
 * Real backend client for election results.
 * GET /api/v1/elections/:id/results
 * Returns 403 until results are published.
 */

export interface ResultsCandidate {
  candidateId: number;
  candidateName: string;
  voteCount: number;
  percentage: number;
  rank: number;
}

export interface ResultsPosition {
  positionId: number;
  positionName: string;
  candidates: ResultsCandidate[];
}

export interface ResultsConstituency {
  constituencyId: number;
  constituencyName: string;
  positions: ResultsPosition[];
}

export interface ElectionResultsResponse {
  electionId: number;
  electionName: string;
  publishedAt: string | null;
  status: string;
  totalEligible: number;
  totalVotes: number;
  participation: number;
  constituencies: ResultsConstituency[];
}

/* ------------------------- UI-facing mapped shape ------------------------- */

export interface MappedCandidateResult {
  id: string;
  name: string;
  votes: number;
  percentage: number;
  rank: number;
  status: "winner" | "runner_up" | "other";
}

export interface MappedPositionResult {
  position: string;
  totalVotes: number;
  abstained: number;
  candidates: MappedCandidateResult[];
  isTie: boolean;
  /** Present for Class Representative seats, e.g. "BCA 2nd Year Section A". */
  scope?: string;
}

export interface MappedElectionResults {
  electionName: string;
  publishedDate: string;
  publishedBy: string;
  status: "not_published" | "published";
  eligibleStudents: number;
  ballotsSubmitted: number;
  participation: number;
  totalPositions: number;
  totalCandidates: number;
  positions: MappedPositionResult[];
}

export class ResultsNotPublishedError extends Error {
  constructor(message = "Results have not been published for this election") {
    super(message);
    this.name = "ResultsNotPublishedError";
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

/** Fetch results for an election. Throws ResultsNotPublishedError when 403. */
export async function fetchElectionResults(
  electionId: number
): Promise<MappedElectionResults> {
  const res = await fetch(`${API_BASE}/elections/${electionId}/results`, {
    cache: "no-store",
  });

  if (res.status === 403) {
    throw new ResultsNotPublishedError();
  }
  if (!res.ok) {
    throw new Error(`Failed to load results (${res.status})`);
  }

  const json = (await res.json()) as { data: ElectionResultsResponse };
  return mapResults(json.data);
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Convert the backend shape into the shape the results UI expects. */
export function mapResults(data: ElectionResultsResponse): MappedElectionResults {
  const positions: MappedPositionResult[] = [];

  const appendScope = (
    scope: string | undefined,
    scopePositions: ResultsPosition[]
  ) => {
    for (const pos of scopePositions) {
      const sorted = [...pos.candidates].sort((a, b) => b.voteCount - a.voteCount);
      // Tie when the top two candidates share the same vote count
      const isTie =
        sorted.length >= 2 && sorted[0].voteCount === sorted[1].voteCount;
      const totalVotes = sorted.reduce((sum, c) => sum + c.voteCount, 0);

      positions.push({
        position: pos.positionName,
        totalVotes,
        abstained: 0,
        isTie,
        scope,
        candidates: sorted.map((c) => ({
          id: String(c.candidateId),
          name: c.candidateName,
          votes: c.voteCount,
          percentage: c.percentage,
          rank: c.rank,
          status: isTie
            ? c.rank === 1
              ? "winner"
              : "other"
            : c.rank === 1
            ? "winner"
            : c.rank === 2
            ? "runner_up"
            : "other",
        })),
      });
    }
  };

  for (const constituency of data.constituencies) {
    appendScope(constituency.constituencyName, constituency.positions);
  }

  return {
    electionName: data.electionName,
    publishedDate: formatDate(data.publishedAt),
    publishedBy: "Election Administration",
    status: "published",
    eligibleStudents: data.totalEligible,
    ballotsSubmitted: data.totalVotes,
    participation: data.participation,
    totalPositions: positions.length,
    totalCandidates: positions.reduce((sum, p) => sum + p.candidates.length, 0),
    positions,
  };
}