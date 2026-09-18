"use client";

import React from "react";
import { CandidateLayout } from "@/components/candidate-dashboard/CandidateLayout";
import { GuidelinesContent } from "@/components/guidelines/GuidelinesContent";

export default function CandidateGuidelinesPage() {
  return (
    <CandidateLayout>
      <GuidelinesContent variant="candidate" helpHref="/candidate/help" />
    </CandidateLayout>
  );
}