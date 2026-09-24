"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSignOut } from "@/hooks/useSignOut";
import {
  LayoutDashboard,
  Vote,
  Users,
  ReceiptText,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";

export interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className, onNavigate }) => {
  const pathname = usePathname();
  const signOut = useSignOut();

  const menuItems = [
    { label: "Dashboard", href: "/student/dashboard", icon: LayoutDashboard },
    { label: "Vote", href: "/student/vote", icon: Vote },
    { label: "Candidates", href: "/student/candidates", icon: Users },
    { label: "My Receipt", href: "/student/receipt", icon: ReceiptText },
    { label: "Profile & Settings", href: "/student/profile", icon: Settings },
    { label: "Help & Support", href: "/student/help", icon: HelpCircle },
  ];

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white dark:bg-[#252540] border-r border-border shadow-[4px_0_20px_rgba(32,39,92,0.04)] w-68 shrink-0 rounded-r-2xl",
        className
      )}
    >
      {/* Brand area */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <img src="/image/dbit logo.jpeg" alt="DBIT Logo" className="w-10 h-10 rounded-xl object-cover" />
        <div className="flex flex-col">
          <span className="font-semibold text-text-primary tracking-wide text-sm">Don Bosco Institute of Technology</span>
          <span className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">
            Election Platform
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-4 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/10"
                  : "text-text-secondary hover:bg-primary-50 hover:text-primary-700"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors shrink-0",
                  isActive ? "text-primary-700" : "text-text-muted"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section (Logout) */}
      <div className="p-4 border-t border-border shrink-0">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-error-600 hover:bg-error-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};