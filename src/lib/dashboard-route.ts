/**
 * Returns the correct dashboard route for a given role.
 *
 * STUDENT role maps to the student portal (/student/dashboard).
 * CANDIDATE role maps to the candidate dashboard (/candidate/dashboard) —
 * its layout bounces unapproved applicants to /candidate/status.
 */
export function getDashboardRoute(role: string): string {
  const normalized = String(role || "").toUpperCase();

  const routes: Record<string, string> = {
    STUDENT: "/student/dashboard",
    CANDIDATE: "/candidate/dashboard",
    ADMIN: "/admin/dashboard",
    CAD: "/cad/dashboard",
  };

  return routes[normalized] || "/candidate/status";
}

export type Portal = "student" | "candidate";

/**
 * Portal-sticky destination: the page the user signed in/up from decides
 * which portal they land in — the backend role never pulls them across.
 *
 * - Student portal: everyone lands on /student/dashboard (approved
 *   candidates are students too and vote from there). ADMIN/CAD keep
 *   their own dashboards.
 * - Candidate portal: CANDIDATE lands on /candidate/dashboard, everyone
 *   else (pending applicants) on the /candidate/status waiting room.
 *   ADMIN/CAD keep their own dashboards.
 */
export function destinationForPortal(portal: Portal, backendRole: string | undefined): string {
  const r = String(backendRole || "").toUpperCase();
  if (r === "ADMIN") return "/admin/dashboard";
  if (r === "CAD") return "/cad/dashboard";
  if (portal === "candidate") {
    return r === "CANDIDATE" ? "/candidate/dashboard" : "/candidate/status";
  }
  return "/student/dashboard";
}
