"use client";

import React from "react";
import { CandidateLayout } from "@/components/candidate-dashboard/CandidateLayout";
import { HelpContent } from "@/components/help/HelpContent";

export default function CandidateHelpPage() {
  return (
    <CandidateLayout>
      <HelpContent variant="candidate" />
    </CandidateLayout>
  );
}