"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CourseSelect } from "@/components/ui/CourseSelect";
import { BatchSelect } from "@/components/ui/BatchSelect";
import { api, ApiError } from "@/lib/api/client";
import type { Course, Section, Year } from "@/lib/class-data";

const DASHBOARDS: Record<string, string> = {
  student: "/student/dashboard",
  candidate: "/candidate/dashboard",
};

function CompleteProfileForm() {
  const router = useRouter();
  const params = useSearchParams();

  const nextRaw = params.get("next") || "";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : DASHBOARDS.student;

  const [rollNumber, setRollNumber] = useState("");
  const [course, setCourse] = useState<"" | Course>("");
  const [batch, setBatch] = useState<{ section: Section; year: Year | "" }>({ section: "", year: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const roll = rollNumber.trim();
    if (roll.length < 3 || roll.length > 64) {
      setError("Please enter a valid roll / enrollment number (3-64 characters).");
      return;
    }
    if (!course) {
      setError("Please select your course.");
      return;
    }
    if (!batch.year) {
      setError("Please select your batch.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/auth/profile", {
        rollNumber: roll,
        department: course,
        year: batch.year,
        section: batch.section,
      });
      router.replace(next);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save your profile. Please try again."
      );
      setSaving(false);
    }
  };

  const selectClass =
    "w-full px-4 py-2.5 text-sm bg-white dark:bg-[#252540] border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500";

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-6 h-6 text-primary-600" />
          </div>
          <AuthHeader
            title="Complete Your Profile"
            subtitle="One-time step — your roll number, course and batch"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="profile-roll"
            label="Roll / Enrollment Number"
            type="text"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="e.g. 2SI21CS001"
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label htmlFor="profile-course" className="text-xs font-medium text-text-secondary">
              Course
            </label>
            <CourseSelect
              id="profile-course"
              value={course}
              onChange={(c) => {
                setCourse(c);
                setBatch({ section: "", year: "" });
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-batch" className="text-xs font-medium text-text-secondary">
              Batch
            </label>
            <BatchSelect
              id="profile-batch"
              course={course}
              value={batch}
              onChange={(b) => setBatch(b)}
              required
            />
          </div>

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
              "Save & Continue"
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          These details lock your class identity for voting and candidacy. Contact the
          administrator if you need to change them later.
        </p>
      </AuthCard>
    </AuthLayout>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={null}>
      <CompleteProfileForm />
    </Suspense>
  );
}
