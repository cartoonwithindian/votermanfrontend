"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getMe } from "@/lib/api/v1";

/**
 * RequireProfile — first-time registration gate.
 * STUDENT/CANDIDATE accounts created by the Clerk bridge start bare
 * (no roll number / mobile number). Until POST /auth/profile completes, bounce
 * them to /complete-profile. ADMIN/CAD roles are exempt (no class identity).
 */
export function RequireProfile({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // The dedicated login pages live inside the portal layouts but must
      // never trigger the profile gate (their visitors are signed out or
      // mid-registration).
      if (pathname === "/student/login" || pathname === "/candidate/login") {
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const me = await getMe();
        if (cancelled) return;
        const u = me.authenticated ? me.user : null;
        if (
          u &&
          (u.role === "STUDENT" || u.role === "CANDIDATE") &&
          !u.rollNumber &&
          !u.mobileNumber
        ) {
          const next = pathname?.startsWith("/") ? pathname : "/student/dashboard";
          router.replace(`/complete-profile?next=${encodeURIComponent(next)}`);
          return;
        }
      } catch {
        // API unreachable — let the page render with its own error states.
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return <>{children}</>;
}
