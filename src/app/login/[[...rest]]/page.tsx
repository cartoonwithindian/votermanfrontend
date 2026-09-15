"use client";

import { UnifiedAuthPage } from "../unified-auth";

/**
 * Single home for Student + Candidate auth. Sign in and registration live
 * on this one page behind a role toggle (?role=student|candidate) and a
 * mode tab (?tab=login|register). Admin and CAD keep their own portals at
 * /login/admin and /login/cad.
 */
export default function LoginPage() {
  return <UnifiedAuthPage />;
}
