"use client";

import React from "react";
import { Vote, CheckCircle2 } from "lucide-react";
import { CampusVoteLogo } from "./CampusVoteLogo";
import { AuthBranding } from "./AuthBranding";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const DecorativeShapes: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none select-none", className)} aria-hidden="true">
      {/* Soft corner blob top-right */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary-500/20 blur-3xl" />
      {/* Soft blob bottom-left */}
      <div className="absolute -bottom-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary-400/15 blur-3xl" />
      {/* Small accent dot top-left */}
      <div className="absolute top-16 left-16 w-6 h-6 rounded-full bg-white/20" />
      {/* Small accent dot bottom-right */}
      <div className="absolute bottom-28 right-24 w-4 h-4 rounded-full bg-white/15" />
      {/* Thin arc */}
      <div className="absolute top-1/3 right-10 w-32 h-32 rounded-full border-[10px] border-white/10 -translate-y-1/2" />
      {/* Voting check circle */}
      <div className="absolute bottom-20 left-1/4 w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
        <CheckCircle2 className="w-6 h-6 text-white/40" />
      </div>
      {/* Faint large vote icon */}
      <div className="absolute top-20 left-[45%] opacity-[0.04]">
        <Vote className="w-56 h-56 text-white" />
      </div>
    </div>
  );
};

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, className }) => {
  return (
    <div className={cn("min-h-screen bg-bg-primary relative", className)}>
      <DecorativeShapes />

      <div className="relative min-h-screen flex flex-col lg:flex-row">
        {/* Left Branding Panel */}
        <div className="hidden lg:flex lg:w-[46%] xl:w-[48%] bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 relative p-10">
          {/* Inner decorative curves */}
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-600/20 rounded-tl-[40%] pointer-events-none" aria-hidden="true" />
          <div className="absolute top-10 left-10 w-3 h-3 rounded-full bg-white/20" aria-hidden="true" />
          <div className="absolute top-16 right-16 w-2 h-2 rounded-full bg-white/15" aria-hidden="true" />

          <div className="relative z-10 flex flex-col h-full max-w-md w-full mx-auto">
            <CampusVoteLogo size="lg" />
            <div className="flex-1 py-10">
              <AuthBranding />
            </div>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-center p-4 min-[380px]:p-6 bg-transparent">
            <CampusVoteLogo size="md" />
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center p-3 min-[380px]:p-5 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">{children}</div>
          </div>

          {/* Footer */}
          <div className="hidden lg:block p-6 text-center">
            <p className="text-[11px] text-text-muted font-medium">
              © 2026 Don Bosco Institute of Technology. Secure &amp; Neutral Student Elections.
            </p>
            <p className="text-[11px] text-text-muted font-medium mt-1">
              <a href="https://made-a.tech/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                made-a.tech
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};