"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getMe } from "@/lib/api/v1";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Vote,
  BarChart3,
  Shield,
  Menu,
  X,
  Loader2,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/cad/dashboard", icon: LayoutDashboard },
  { label: "Elections", href: "/cad/elections", icon: Vote },
  { label: "Results", href: "/cad/results", icon: BarChart3 },
];

export const CadLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [role, setRole] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getMe();
        if (cancelled) return;
        if (!me.authenticated) {
          router.replace("/login/cad");
          return;
        }
        const r = me.user?.role ?? "";
        setRole(r);
        if (r === "CAD" || r === "ADMIN") setState("ok");
        else setState("denied");
      } catch {
        if (!cancelled) router.replace("/login/cad");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex items-center gap-3 text-text-secondary">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-semibold">Verifying access…</span>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary p-6">
        <div className="max-w-md text-center">
          <Shield className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-text-primary">Access Denied</h1>
          <p className="text-sm text-text-secondary mt-2">
            The CAD portal is restricted to election monitors. Your account role is {role || "unknown"}.
          </p>
          <Link
            href="/student/login"
            className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  const sidebar = (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
              active
                ? "bg-primary-600 text-white"
                : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        );
      })}
      {role === "ADMIN" && (
        <>
          <div className="pt-3 pb-1 px-3 text-[10px] font-bold tracking-widest text-text-muted">
            STAFF TOOLS
          </div>
          <Link
            href="/admin/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          >
            <Shield className="w-4 h-4" />
            Admin Portal
          </Link>
        </>
      )}
    </nav>
  );

  return (
    <div className="flex h-screen bg-bg-primary overflow-hidden">
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-bg-secondary p-4">
        <div className="flex items-center gap-2 px-2 pb-4 mb-2 border-b border-border">
          <Vote className="w-5 h-5 text-primary-600" />
          <div>
            <p className="text-sm font-extrabold text-text-primary leading-tight">CAD Monitor</p>
            <p className="text-[11px] text-text-muted">Election oversight</p>
          </div>
        </div>
        {sidebar}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-bg-secondary border-r border-border p-4">
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-border">
              <p className="text-sm font-extrabold text-text-primary">CAD Monitor</p>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-bg-secondary">
          <div className="flex items-center gap-2">
            <Vote className="w-5 h-5 text-primary-600" />
            <p className="text-sm font-extrabold text-text-primary">CAD Monitor</p>
          </div>
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="w-5 h-5 text-text-secondary" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};
