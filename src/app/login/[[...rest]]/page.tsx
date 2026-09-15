"use client";

import { UnifiedAuthPage } from "@/components/auth/UnifiedAuth";

// Original unified Student + Candidate login page — the toggle selects the
// portal; the backend account role decides the final dashboard. Kept as the
// working baseline while /student/login and /candidate/login serve locked
// portal variants.
export default function LoginPage() {
  return <UnifiedAuthPage />;
}