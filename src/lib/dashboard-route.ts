/**
 * Returns the correct dashboard route for a given role.
 *
 * STUDENT role maps to the student portal (/student/dashboard).
 * CANDIDATE role maps to /candidate/status.
 */
export function getDashboardRoute(role: string): string {
  const normalized = String(role || "").toUpperCase();

  const routes: Record<string, string> = {
    STUDENT: "/student/dashboard",
    CANDIDATE: "/candidate/status",
    ADMIN: "/admin/dashboard",
    CAD: "/cad/dashboard",
  };

  return routes[normalized] || "/candidate/status";
}
