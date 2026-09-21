/**
 * Returns the correct dashboard route for a given role.
 *
 * STUDENT and CANDIDATE roles both map to /student/dashboard.
 * There is no separate candidate portal — candidates are managed via
 * admin JSON upload.
 */
export function getDashboardRoute(role: string): string {
  const normalized = String(role || "").toUpperCase();

  const routes: Record<string, string> = {
    STUDENT: "/student/dashboard",
    CANDIDATE: "/student/dashboard",
    ADMIN: "/admin/dashboard",
    CAD: "/cad/dashboard",
  };

  return routes[normalized] || "/student/dashboard";
}

export type Portal = "student" | "candidate";

/**
 * Portal-sticky destination: the page the user signed in/up from decides
 * which portal they land in — the backend role never pulls them across.
 *
 * Both STUDENT and CANDIDATE land on /student/dashboard.
 */
export function destinationForPortal(portal: Portal, backendRole: string | undefined): string {
  const r = String(backendRole || "").toUpperCase();
  if (r === "ADMIN") return "/admin/dashboard";
  if (r === "CAD") return "/cad/dashboard";
  return "/student/dashboard";
}
