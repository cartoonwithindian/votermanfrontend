"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Hash, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveRollNumber } from "@/lib/roll-number";

const DASHBOARDS: Record<string, string> = {
  student: "/student/dashboard",
  candidate: "/student/dashboard",
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  candidate: "Candidate",
};

function RollNumberForm() {
  const router = useRouter();
  const params = useSearchParams();

  const role =
    params.get("role") === "candidate" ? "candidate" : "student";
  const email = params.get("email")?.trim() || "";

  const nextRaw = params.get("next") || "";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : DASHBOARDS[role];

  const [roll, setRoll] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const value = roll.trim();
    if (!value) {
      setError("Please enter your roll number");
      return;
    }
    if (!/^[A-Za-z0-9/\\-]{3,20}$/.test(value)) {
      setError(
        "Roll number should be 3-20 characters (letters, numbers, / or - only)"
      );
      return;
    }

    setSaving(true);
    saveRollNumber(role, email || "unknown", value);
    // Small delay so the saved state is noticeable before leaving.
    setTimeout(() => router.replace(next), 300);
  };

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Hash className="w-6 h-6 text-primary-600" />
          </div>
          <AuthHeader
            title="Enter Your Roll Number"
            subtitle={`${
              ROLE_LABELS[role] || "Student"
            } roll number is required to continue`}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            placeholder="e.g. 2SI21CS001"
            required
            autoFocus
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Continue"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Your roll number is used to verify your identity for the election.
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

export default function RollNumberPage() {
  return (
    <Suspense fallback={null}>
      <RollNumberForm />
    </Suspense>
  );
}
