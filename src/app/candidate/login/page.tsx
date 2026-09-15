"use client";

import { UnifiedAuthPage } from "@/components/auth/UnifiedAuth";

/**
 * Candidate portal auth — sign in + registration for candidates.
 * The form is locked to the candidate portal; the backend account role
 * still decides the final dashboard.
 */
export default function CandidateLoginPage() {
  return <UnifiedAuthPage initialPortal="candidate" lockPortal />;
}
