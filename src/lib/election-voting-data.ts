"use client";

// Mock election data for CampusVote Module 4
// Student Council Election 2026 — Voting Flow

export type VotingElectionStatus = "open" | "closed" | "not_eligible" | "already_voted";

export interface VotingCandidate {
  id: string;
  name: string;
  department: string;
  year: string;
  photoInitials: string;
  photo?: string | null;
  campaignSymbol: string;
  shortManifesto: string;
}

export interface VotingPosition {
  id: string;
  name: string;
  order: number;
  candidates: VotingCandidate[];
  /** Real backend constituency id for the Class Representative position. */
  constituencyId?: string;
}

export interface VotingElection {
  id: string;
  name: string;
  status: VotingElectionStatus;
  votingPeriod: {
    start: string;
    end: string;
    startTime: string;
    endTime: string;
  };
  eligible: boolean;
  hasVoted: boolean;
  positions: VotingPosition[];
}

export const MOCK_VOTING_ELECTION: VotingElection = {
  id: "election-2026",
  name: "Student Council Election 2026",
  status: "open",
  votingPeriod: {
    start: "10 August 2026",
    end: "10 August 2026",
    startTime: "9:00 AM",
    endTime: "5:00 PM",
  },
  eligible: true,
  hasVoted: false,
  positions: [],
};

export type BallotSelection = {
  positionId: string;
  // undefined = not answered yet, null = abstain
  candidateId?: string | null;
};
