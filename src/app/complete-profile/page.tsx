"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api, ApiError } from "@/lib/api/client";

const DASHBOARDS: Record<string, string> = {
  student: "/student/dashboard",
  candidate: "/candidate/dashboard",
};

function CompleteProfileForm() {
  const router = useRouter();
  const params = useSearchParams();

  const nextRaw = params.get("next") || "";
  // Role-aware next: student -> vote and finish, candidate -> form filling
  const portalHint = (params.get("portal") || params.get("role") || "").toLowerCase();
  const isCandidatePortal = portalHint === "candidate";
  const fallbackNext = isCandidatePortal ? "/candidate/apply" : DASHBOARDS.student;
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : fallbackNext;

  const [rollNumber, setRollNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  // Course/batch now come from whitelist (pre-filled), not user-selected
  const [course, setCourse] = useState<string>("");
  const [batch, setBatch] = useState<{ section: string; year: string }>({ section: "", year: "" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("STUDENT");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch whitelisted profile (name/email/class pre-filled)
  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await api.get("/students/profile");
        const data = res?.data ?? res;
        setName(data?.name || "");
        setEmail(data?.email || data?.official_email || data?.current_login_email || "");
        setCourse(data?.department || "");
        setBatch({ section: data?.section || "", year: data?.year || data?.year_or_semester || "" });
        setRole(String(data?.role || "STUDENT").toUpperCase());
        // If profile already completed (roll/mobile set), skip this page
        if (data?.enrollmentNumber || data?.phone) {
          router.replace(next);
        }
      } catch (e) {
        // If unauthenticated, let the api client redirect; otherwise show error
        console.error("load profile failed", e);
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, [router, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Course/batch are pre-filled from whitelist; just validate presence
    if (!course || !batch.year) {
      setError("Your class could not be determined. Please contact the support team.");
      return;
    }

    const isFirstYear = batch.year === "1st Year" || batch.year === "1 Sem";
    const payload: {
      rollNumber?: string;
      mobileNumber?: string;
      department: string;
      year: string;
      section: string;
    } = {
      department: course,
      year: batch.year,
      section: batch.section,
    };

    if (isFirstYear) {
      const phone = mobileNumber.replace(/[\s()-]/g, "").trim();
      if (!/^\+?[0-9]{10,15}$/.test(phone)) {
        setError("Please enter a valid mobile number (10-15 digits, optional + prefix).");
        return;
      }
      payload.mobileNumber = phone;
    } else {
      const roll = rollNumber.trim();
      if (roll.length < 3 || roll.length > 64) {
        setError("Please enter a valid roll / enrollment number (3-64 characters).");
        return;
      }
      payload.rollNumber = roll;
    }

    setSaving(true);
    try {
      await api.post("/auth/profile", payload);
      // Role-aware redirect: student -> vote and finish, candidate -> form filling
      if (String(role).toUpperCase() === "CANDIDATE" || isCandidatePortal) {
        router.replace("/candidate/apply");
      } else {
        router.replace(next);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not save your profile. Please try again."
      );
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <AuthLayout>
        <AuthCard>
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600 mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Loading your profile…</p>
          </div>
        </AuthCard>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthCard>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-6 h-6 text-primary-600" />
          </div>
          <AuthHeader
            title="Complete Your Profile"
            subtitle={String(role).toUpperCase() === "CANDIDATE" ? "One-time step — confirm your details to start your candidacy" : "One-time step — confirm your mobile/roll to start voting"}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name & Email pre-filled from whitelist (read-only) */}
          <Input id="profile-name" label="Full Name" type="text" value={name} disabled placeholder="Your name" />
          <Input id="profile-email" label="Email" type="email" value={email} disabled placeholder="Your email" />

          {/* Class pre-filled from whitelist (read-only) */}
          <div className="p-3 rounded-xl bg-bg-tertiary border border-border">
            <p className="text-xs font-medium text-text-secondary">Your Class (from whitelist)</p>
            <p className="text-sm font-semibold text-text-primary mt-1">
              {[course, batch.year, batch.section ? `Section ${batch.section}` : null].filter(Boolean).join(" • ") || "—"}
            </p>
            <p className="text-xs text-text-muted mt-1">Contact support team if this is incorrect.</p>
          </div>

          {batch.year === "1st Year" || batch.year === "1 Sem" ? (
            <Input
              id="profile-phone"
              label="Mobile / Phone Number"
              type="tel"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              required
              autoFocus
            />
          ) : (
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
          )}

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
