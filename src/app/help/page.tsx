"use client";

import React from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import {
  HelpCircle,
  Mail,
  ChevronRight,
  Shield,
  Vote,
  CheckCircle2,
  LogIn,
  ArrowLeft,
} from "lucide-react";

const helpSections = [
  {
    icon: LogIn,
    title: "Signing In",
    items: [
      "Select your role (Student or Administrator) on the login page.",
      "Enter your email address and click 'Send Login Code'.",
      "Check your inbox for the 6-digit verification code.",
      "Enter the code to sign in. The code expires after 5 minutes.",
    ],
  },
  {
    icon: Vote,
    title: "Voting",
    items: [
      "Go to the 'Vote' section from your dashboard.",
      "Review all candidates and their manifestos.",
      "Select your preferred candidate for each position.",
      "Review your selections before submitting.",
      "After voting, you'll receive a cryptographic receipt.",
    ],
  },
  {
    icon: Shield,
    title: "Security & Privacy",
    items: [
      "Your vote is encrypted and never linked to your identity.",
      "Cryptographic receipts allow independent verification.",
      "All data is transmitted over secure connections.",
      "No one can see who you voted for.",
    ],
  },
  {
    icon: CheckCircle2,
    title: "Verifying Your Vote",
    items: [
      "After voting, you receive a unique receipt ID.",
      "Use the 'Verify' page to confirm your ballot was counted.",
      "Enter your receipt ID to check the verification status.",
      "Your vote is included in the public tally.",
    ],
  },
];

export default function HelpPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <div className="mb-6">
          <Link
            href="/student/login"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">Help & Support</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Find answers to common questions about CampusVote.
          </p>
        </div>

        <div className="space-y-5">
          {helpSections.map((section) => (
            <div key={section.title}>
              <div className="flex items-center gap-2 mb-2">
                <section.icon className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-gray-900">
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-1.5 ml-6">
                {section.items.map((item, i) => (
                  <li
                    key={i}
                    className="text-xs text-gray-600 leading-relaxed flex items-start gap-2"
                  >
                    <ChevronRight className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="w-3.5 h-3.5" />
            <span>
              Need more help? Contact{" "}
              <a
                href="mailto:election-admin@example.com"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                election-admin@example.com
              </a>
            </span>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
