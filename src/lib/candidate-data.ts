"use client";

// Mock candidate data for CampusVote Module 3
// 12 fictional candidates across multiple positions and departments

import type { Course, Year } from "./class-data";

export type CandidatePosition = 
  | "President" 
  | "Vice President" 
  | "General Secretary" 
  | "Treasurer" 
  | "Cultural Secretary";

export type CandidateDepartment = Course;

export type CandidateYear = Year;

export interface ManifestoSection {
  title: string;
  content: string;
}

export interface Candidate {
  id: string;
  name: string;
  position: CandidatePosition;
  department: CandidateDepartment;
  year: CandidateYear;
  photoInitials: string;
  campaignSymbol: string;
  verified: boolean;
  biography: string;
  manifestos: ManifestoSection[];
}

export const CANDIDATES: Candidate[] = [];