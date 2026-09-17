"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { studentApi } from "@/lib/api/students";
import { getMe, listElections } from "@/lib/api/v1";
import {
  GraduationCap,
  BookOpen,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Settings,
  Camera,
  Layers,
} from "lucide-react";

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "ST";
}

interface ProfileInfo {
  name: string;
  enrollmentNumber: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  year: string | null;
  section: string | null;
  isActive: boolean;
  votingEligible: boolean;
  electionName: string | null;
  electionStatus: string | null;
  avatar: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [meResult, profileResult, electionsResult] = await Promise.allSettled([
        getMe(),
        studentApi.getProfile(),
        listElections(),
      ]);

      if (!alive) return;

      const me = meResult.status === "fulfilled" && meResult.value.authenticated
        ? meResult.value.user
        : null;
      const student = profileResult.status === "fulfilled" ? profileResult.value : null;
      const elections = electionsResult.status === "fulfilled" ? electionsResult.value : [];

      const active = elections.find((e) =>
        ["SCHEDULED", "OPEN", "PUBLISHED"].includes(e.status)
      ) || null;

      const name = student?.name || me?.name || "Student";

      // Avatar comes from Appwrite Storage bucket "Profile Images & Candidate Photos"
      // (folder: profiles/) — education pack: 5MB, zstd, antivirus, transformations
      const avatar = (student as unknown as { avatar?: string | null; profileImageUrl?: string | null })?.avatar ||
                     (student as unknown as { avatar?: string | null; profileImageUrl?: string | null })?.profileImageUrl ||
                     null;

      setProfile({
        name,
        enrollmentNumber: student?.enrollmentNumber || me?.rollNumber || null,
        email: student?.email || me?.email || null,
        phone: student?.phone || null,
        department: student?.department || null,
        year: student?.year || null,
        section: student?.section || null,
        isActive: student?.isActive ?? true,
        votingEligible: student?.votingEligible ?? false,
        electionName: active?.name || null,
        electionStatus: active?.status || null,
        avatar,
      });
      setFormData({ name, phone: student?.phone || "" });
      setAvatarPreview(avatar || null);
      setAvatarDataUrl(null);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const validate = () => {
    const newErrors: { name?: string; phone?: string } = {};
    if (!formData.name.trim()) newErrors.name = "Name is required.";
    if (
      formData.phone &&
      !/^\+91\s\d{5}\s\d{5}$/.test(formData.phone.trim()) &&
      formData.phone !== profile?.phone
    ) {
      newErrors.phone = "Enter a valid phone number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Downscale helper (mirrors candidate-api downscale — keeps uploads ~80KB)
  const downscaleToDataUrl = async (file: File): Promise<string> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("Could not read file"));
      r.readAsDataURL(file);
    });
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new window.Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Invalid image"));
        i.src = dataUrl;
      });
      const max = 512;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return dataUrl;
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return dataUrl;
    }
  };

  const handleAvatarChange = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSaveError("Please upload a PNG, JPG, JPEG, or WEBP image.");
      return;
    }
    setSaveError(null);
    setUploadingAvatar(true);
    try {
      const dataUrl = await downscaleToDataUrl(file);
      setAvatarPreview(dataUrl);
      setAvatarDataUrl(dataUrl);
    } catch {
      setSaveError("Could not process that image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      let avatarUrl: string | null | undefined = undefined;
      // If avatar was changed, upload to Appwrite Storage (bucket: candidate-photos, folder: profiles/)
      if (avatarDataUrl) {
        const up = await studentApi.uploadProfileImage(avatarDataUrl);
        avatarUrl = up.url;
      }
      const updated = await studentApi.updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        // Persist avatar URL to students.profile_image_url via backend
        ...(avatarUrl !== undefined ? { profileImageUrl: avatarUrl } : {}),
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name || formData.name,
              phone: (updated as unknown as { phone?: string | null })?.phone ?? formData.phone,
              avatar: (updated as unknown as { avatar?: string | null })?.avatar ?? avatarUrl ?? prev.avatar,
            }
          : prev
      );
      if (avatarUrl) {
        setAvatarPreview(avatarUrl);
        setAvatarDataUrl(null);
      }
      setIsEditing(false);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save profile. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({ name: profile.name, phone: profile.phone || "" });
      setAvatarPreview(profile.avatar || null);
      setAvatarDataUrl(null);
    }
    setErrors({});
    setSaveError(null);
    setIsEditing(false);
  };

  return (
    <StudentLayout studentName={profile?.name}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Profile</h1>
            <p className="text-sm text-text-secondary">
              View and manage your CampusVote account information.
            </p>
          </div>
          <Link href="/student/settings">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Save Success Toast */}
        {showSaveSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-success-50 border border-success/20 text-sm text-success">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated successfully.
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 border border-error/20 text-sm text-error">
            {saveError}
          </div>
        )}

        {/* Profile Header */}
        <Card className="p-6 border-border">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  initialsFor(profile?.name || "Student")
                )}
              </div>
              {isEditing && (
                <label className={`absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer ${uploadingAvatar ? "pointer-events-none opacity-50" : ""}`}>
                  <Camera className="w-6 h-6 text-white" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      await handleAvatarChange(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {uploadingAvatar && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] bg-black/70 text-white px-2 py-0.5 rounded-full">processing…</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-text-primary">{profile?.name}</h2>
              {profile?.enrollmentNumber && (
                <p className="text-sm text-text-secondary font-mono">{profile.enrollmentNumber}</p>
              )}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {profile?.department && (
                  <Badge variant="info" className="text-[10px]">{profile.department}</Badge>
                )}
                {profile?.year && (
                  <Badge variant="neutral" className="text-[10px]">{profile.year}</Badge>
                )}
                {profile?.section && (
                  <Badge variant="neutral" className="text-[10px]">Section {profile.section}</Badge>
                )}
                {profile?.votingEligible ? (
                  <Badge variant="success" className="text-[10px]">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Eligible to Vote
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[10px]">Awaiting eligibility</Badge>
                )}
              </div>
            </div>

            {/* Edit Button */}
            {!isEditing ? (
              <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-3.5 h-3.5" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleCancel}>
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleSave}
                  isLoading={isSaving}
                  disabled={isSaving}
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {!profile?.isActive && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 border border-error/20 text-sm text-error">
            Your account is currently deactivated. Contact the election administrator.
          </div>
        )}

        {/* Personal Information */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4 border-b border-border pb-3">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
                Full Name
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.name && (
                    <p className="text-xs text-error mt-1">{errors.name}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-primary">{profile?.name || "—"}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
                Email
              </label>
              <p className="text-sm text-text-primary">{profile?.email || "—"}</p>
            </div>

            <div>
              <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
                Phone
              </label>
              {isEditing ? (
                <div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {errors.phone && (
                    <p className="text-xs text-error mt-1">{errors.phone}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-text-primary">{profile?.phone || "—"}</p>
              )}
            </div>

            <div>
              <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
                Enrollment / Roll Number
              </label>
              <p className="text-sm text-text-primary">{profile?.enrollmentNumber || "—"}</p>
            </div>
          </div>
        </Card>

        {/* Academic Information */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4 border-b border-border pb-3">
            Academic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: "Program / Department", value: profile?.department || "—", icon: GraduationCap },
              { label: "Year", value: profile?.year || "—", icon: BookOpen },
              { label: "Section", value: profile?.section ? `Section ${profile.section}` : "—", icon: Layers },
            ].map((item) => (
              <div key={item.label}>
                <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
                  {item.label}
                </label>
                <p className="text-sm text-text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Election Eligibility */}
        <Card className="p-5 border-border">
          <h3 className="text-sm font-semibold text-text-primary mb-3 border-b border-border pb-3">
            Election Eligibility
          </h3>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${profile?.votingEligible ? "bg-success-50" : "bg-bg-tertiary/50"}`}>
            <CheckCircle2 className={`w-5 h-5 shrink-0 ${profile?.votingEligible ? "text-success" : "text-text-secondary"}`} />
            <div>
              <p className={`text-sm font-medium ${profile?.votingEligible ? "text-success" : "text-text-secondary"}`}>
                {profile?.votingEligible ? "Eligible to participate" : "Eligibility pending"}
              </p>
              <p className="text-xs text-text-secondary">
                {profile?.electionName
                  ? `Election: ${profile.electionName}${profile.electionStatus ? ` • Status: ${profile.electionStatus}` : ""}`
                  : "No election is currently open for voting."}
              </p>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-3">
            Your eligibility is verified from the official voter record.
          </p>
        </Card>
      </div>
    </StudentLayout>
  );
}