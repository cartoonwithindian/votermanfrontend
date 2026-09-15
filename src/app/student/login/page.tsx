"use client";

import { UnifiedAuthPage } from "@/app/login/unified-auth";

/**
 * Student portal auth — sign in + registration for students.
 * The form is locked to the student portal; the backend account role
 * still decides the final dashboard.
 */
export default function StudentLoginPage() {
  return <UnifiedAuthPage initialPortal="student" lockPortal />;
}
