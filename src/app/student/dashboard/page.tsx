"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { User, BookOpen, Megaphone, Vote, CalendarClock, FileText } from "lucide-react";
import {
  getMe,
  listElections,
  listAnnouncements,
  type ElectionV1,
  type AnnouncementV1,
  type CurrentUser,
} from "@/lib/api/v1";

function formatDateRange(start: string | null, end: string | null): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
    });
  if (start && end) {
    const sameDay = new Date(start).toDateString() === new Date(end).toDateString();
    if (sameDay) return `${fmt(start)} • ${fmtTime(start)} – ${fmtTime(end)}`;
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (start) return `Starts ${fmt(start)} at ${fmtTime(start)}`;
  return "Dates to be announced";
}

interface ActiveElection {
  election: ElectionV1;
  state: "open" | "upcoming";
}

function pickActiveElection(elections: ElectionV1[]): ActiveElection | null {
  const open = elections.find((e) => e.status === "OPEN");
  if (open) return { election: open, state: "open" };

  const now = Date.now();
  const scheduled = elections
    .filter((e) => e.status === "SCHEDULED")
    .filter((e) => !e.end_time || new Date(e.end_time).getTime() > now)
    .sort((a, b) => {
      const ta = a.start_time ? new Date(a.start_time).getTime() : Infinity;
      const tb = b.start_time ? new Date(b.start_time).getTime() : Infinity;
      return ta - tb;
    });

  if (scheduled[0]) return { election: scheduled[0], state: "upcoming" };
  return null;
}

export default function StudentDashboardPage() {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [active, setActive] = useState<ActiveElection | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementV1[]>([]);

  useEffect(() => {
    let alive = true;

    (async () => {
      // Identity and election data load independently; only a failure of the
      // core data source (elections) should surface as a page error.
      const [meResult, electionsResult, announcementsResult] =
        await Promise.allSettled([
          getMe(),
          listElections(),
          listAnnouncements(),
        ]);

      if (!alive) return;

      if (meResult.status === "fulfilled" && meResult.value.authenticated) {
        setUser(meResult.value.user);
      }

      if (electionsResult.status === "fulfilled") {
        setActive(pickActiveElection(electionsResult.value));
      } else {
        setLoadError(
          electionsResult.reason instanceof Error
            ? electionsResult.reason.message
            : "Failed to load election data."
        );
      }

      if (announcementsResult.status === "fulfilled") {
        setAnnouncements(announcementsResult.value);
      }

      setPhase("ready");
    })();

    return () => {
      alive = false;
    };
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Student";
  const roleLabel =
    user?.role === "ADMIN"
      ? "Administrator"
      : user?.role === "CANDIDATE"
        ? "Candidate"
        : "Student";

  if (phase === "loading") {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-40 bg-gray-200 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
            <div className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-28 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {loadError && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            Could not load election information: {loadError}
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Hello, {firstName}!
            </h1>
            <p className="text-sm text-text-secondary">
              {user
                ? `Welcome back, ${roleLabel} • ${user.email}`
                : "Welcome back to Don Bosco Institute of Technology."}
            </p>
          </div>
          {user && (
            <div className="text-xs font-bold text-text-muted bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-xl w-fit">
              IP Secured &bull; Session Active
            </div>
          )}
        </div>

        {active ? (
          <div className="rounded-2xl bg-slate-900 text-white border border-slate-800 p-6 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none select-none translate-x-12 translate-y-12">
              <CalendarClock className="w-56 h-56 text-white" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-extrabold tracking-tight">
                    {active.election.name}
                  </h2>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                      active.state === "open"
                        ? "bg-emerald-950/60 text-emerald-300 border-emerald-800"
                        : "bg-blue-950/60 text-blue-300 border-blue-800"
                    }`}
                  >
                    {active.state === "open"
                      ? "🟢 Voting Open"
                      : "🗓 Upcoming Election"}
                  </span>
                </div>
                {active.election.description && (
                  <p className="text-sm text-slate-300 max-w-xl">
                    {active.election.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-800/50 w-fit px-3 py-1.5 rounded-lg border border-slate-800">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatDateRange(active.election.start_time, active.election.end_time)}</span>
                </div>
              </div>
              {active.state === "open" && (
                <Link
                  href="/student/vote"
                  className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-lg"
                >
                  <Vote className="w-4 h-4" />
                  Vote Now
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
            <p className="text-sm text-text-secondary">
              No upcoming election found.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/student/vote">
            <div className="p-4 rounded-xl bg-white border border-border hover:bg-primary-50 hover:border-primary-200 cursor-pointer transition-colors shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <h4 className="font-medium text-text-primary">Vote</h4>
              <p className="text-xs text-text-secondary">Cast your vote</p>
            </div>
          </Link>
          <Link href="/student/candidates">
            <div className="p-4 rounded-xl bg-white border border-border hover:bg-primary-50 hover:border-primary-200 cursor-pointer transition-colors shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5 text-primary-600" />
              </div>
              <h4 className="font-medium text-text-primary">Candidates</h4>
              <p className="text-xs text-text-secondary">View candidates</p>
            </div>
          </Link>

        </div>

        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Megaphone className="w-4 h-4 text-primary-600" />
            <h3 className="font-semibold text-text-primary">Announcements</h3>
          </div>
          {announcements.length === 0 ? (
            <p className="text-sm text-text-secondary">No recent activity</p>
          ) : (
            <ul className="divide-y divide-border">
              {announcements.slice(0, 5).map((a) => (
                <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-text-primary">
                      {a.title}
                    </p>
                    {a.published_at && (
                      <span className="text-[11px] text-text-muted shrink-0">
                        {new Date(a.published_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                    {a.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
