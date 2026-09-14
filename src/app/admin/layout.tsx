"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getMe } from "@/lib/api/v1";
import { getDashboardRoute } from "@/lib/dashboard-route";

/**
 * Admin route guard — wraps every /admin/* page.
 *
 * Anyone who is not an ADMIN (students, candidates, CAD, signed-out
 * visitors) is bounced to their own dashboard instead of seeing the
 * admin portal. This is a UX boundary only; the backend `requireAdmin`
 * middleware remains the real authorization enforcement.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (!me.authenticated || !me.user) {
          router.replace("/login/admin");
          return;
        }
        const role = String(me.user.role || "").toUpperCase();
        if (role === "ADMIN") {
          setAllowed(true);
          return;
        }
        router.replace(role ? getDashboardRoute(role) : "/login");
      } catch {
        if (!cancelled) router.replace("/login/admin");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Checking permissions…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
