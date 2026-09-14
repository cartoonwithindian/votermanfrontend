"use client";

import React, { useState } from "react";
import { CandidateLayout } from "@/components/candidate-dashboard/CandidateLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { ApplicationStatus } from "@/lib/candidate-dashboard-data";
import { useCandidateApplication } from "@/hooks/useCandidateApplication";
import { updateMyProfile } from "@/lib/candidate-api";
import { Lock, Camera, Loader2 } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "success" | "warning" | "error" | "info" | "neutral"; description: string }> = {
  draft: { label: "Draft", variant: "neutral", description: "Your profile is in draft. Submit it for review." },
  submitted: { label: "Submitted", variant: "info", description: "Your profile has been submitted and is awaiting review." },
  under_review: { label: "Under Review", variant: "warning", description: "Election administration is reviewing your profile." },
  changes_requested: { label: "Changes Requested", variant: "error", description: "Please update your profile as requested by the admin." },
  approved: { label: "Approved", variant: "success", description: "Your profile is approved and published. Voters can see it." },
  rejected: { label: "Rejected", variant: "error", description: "Your profile was not approved. Please contact admin." },
};

export default function CandidateProfilePage() {
  const { application } = useCandidateApplication();
  const app = application;
  const profile = app ? {
    name: app.name,
    id: app.id,
    enrollmentNumber: app.enrollmentNumber,
    position: app.position,
    nominationClub: app.nominationClub || null,
    contestingPosition: app.contestingPosition || null,
    department: app.department,
    year: app.year,
    section: app.section,
    bio: app.bio,
    status: app.status,
    photo: app.photo,
    email: app.email,
    phone: app.phone,
    age: app.age,
    dateOfBirth: app.dateOfBirth,
    gender: app.gender,
    aadharNumber: app.aadharNumber,
    campaignLogo: null,
  } : {
    name: "",
    id: "",
    enrollmentNumber: "",
    position: "",
    nominationClub: null,
    contestingPosition: null,
    department: "",
    year: "",
    section: "",
    bio: "",
    status: "draft" as ApplicationStatus,
    photo: null,
    email: "",
    phone: "",
    age: null,
    dateOfBirth: null,
    gender: null,
    aadharNumber: null,
    campaignLogo: null,
  };
  const statusInfo = STATUS_MAP[profile.status || "draft"];
  const isApproved = profile.status === "approved";

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    biography: profile?.bio || "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initials = (profile?.name || "C")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.biography.trim()) newErrors.biography = "Biography is required";
    if (formData.biography.length > 500) newErrors.biography = "Biography must be 500 characters or fewer";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateMyProfile({ bio: formData.biography.trim() });
      setIsEditing(false);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ biography: profile?.bio || "" });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <CandidateLayout
      candidateName={profile?.name || "Candidate"}
      candidateId={profile?.id || ""}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Candidate Profile</h1>
            <p className="text-sm text-text-secondary mt-1">
              Manage your public candidate profile and campaign information.
            </p>
          </div>
          {isApproved && (
            <Button
              variant={isEditing ? "outline" : "primary"}
              onClick={() => {
                if (isEditing) {
                  handleCancel();
                } else {
                  setFormData({ biography: profile?.bio || "" });
                  setErrors({});
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? "Cancel Editing" : "Edit Profile"}
            </Button>
          )}
        </div>

        <Card className="p-6 sm:p-8">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="relative group">
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt={profile.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-white">{initials}</span>
                  </div>
                )}
                {isApproved && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-5 h-5 text-white" />
                    <input type="file" accept="image/*" className="hidden" />
                  </label>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <h2 className="text-xl font-bold text-text-primary">{profile.name}</h2>
                <p className="font-mono text-sm text-text-secondary">{profile.id}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-text-secondary">{profile.position}</span>
                  <span className="text-text-muted">·</span>
                  <span className="text-sm text-text-secondary">{profile.department}</span>
                  <span className="text-text-muted">·</span>
                  <span className="text-sm text-text-secondary">{profile.year}</span>
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 text-sm text-primary-700">
                  <p className="font-medium">Read-only fields</p>
                  <p className="mt-1 text-xs text-primary-600">
                    Name, Enrollment Number, Age, DOB, Gender, Aadhar, Department, Year, Section, and Position cannot be edited after approval.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Full Name 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Enrollment Number 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.enrollmentNumber}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 font-mono cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Position 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.position}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Department 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.department}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Year 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.year}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Section 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.section}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Age 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.age || ""}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Date of Birth 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.dateOfBirth || ""}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Gender 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.gender || ""}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Aadhar Number 🔒
                    </label>
                    <input
                      type="text"
                      value={profile.aadharNumber || ""}
                      disabled
                      className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-secondary bg-primary-50 font-mono cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Application Status
                  </label>
                  <div className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-primary-50">
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Short Biography <span className="text-error-500">*</span>
                  </label>
                  <textarea
                    value={formData.biography}
                    onChange={(e) => handleChange("biography", e.target.value)}
                    maxLength={500}
                    rows={4}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.biography && (
                      <p className="text-xs text-error-600 font-medium">{errors.biography}</p>
                    )}
                    <p className="text-xs text-text-muted ml-auto">
                      {formData.biography.length} / 500
                    </p>
                  </div>
                </div>

                {saveError && (
                  <p className="text-xs text-error-600 font-medium">{saveError}</p>
                )}
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        Saving...
                      </>
                    ) : (
                      "Save Profile"
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-1">Biography</h3>
                  <p className="text-sm text-text-primary leading-relaxed">{profile?.bio || "No biography submitted."}</p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-secondary">Verified Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Full Name 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.name}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Enrollment Number 🔒</p>
                      <p className="text-sm font-mono font-semibold text-text-primary">{profile.enrollmentNumber}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Department 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.department}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Year 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.year}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Section 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.section}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Category 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">Class Representative</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Constituency 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.department} {profile.year} Section {profile.section}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Age 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.age || "—"}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Date of Birth 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.dateOfBirth || "—"}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Gender 🔒</p>
                      <p className="text-sm font-semibold text-text-primary">{profile.gender || "—"}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-bg-tertiary">
                      <p className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Aadhar Number 🔒</p>
                      <p className="text-sm font-mono font-semibold text-text-primary">{profile.aadharNumber || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary">Application Status:</span>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-text-secondary mb-2">Campaign Logo</h3>
                  {profile.campaignLogo ? (
                    <img
                      src={profile.campaignLogo}
                      alt="Campaign Logo"
                      className="h-16 rounded-xl object-contain border border-border"
                    />
                  ) : (
                    <div className="h-16 w-32 bg-neutral-100 border border-dashed border-border rounded-xl flex items-center justify-center">
                      <span className="text-xs text-text-muted">No logo uploaded</span>
                    </div>
                  )}
                </div>

                {isApproved && (
                  <div className="pt-4 border-t border-border">
                    <Button onClick={() => setIsEditing(true)}>Edit Bio &amp; Photo</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Profile Status</h2>
          <div className="flex items-center gap-3">
            <Badge variant={statusInfo.variant} size="md">{statusInfo.label}</Badge>
          </div>
          <p className="text-sm text-text-secondary mt-2">{statusInfo.description}</p>
        </Card>
      </div>
    </CandidateLayout>
  );
}
