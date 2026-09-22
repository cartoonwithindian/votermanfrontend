"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Search, Eye, X, Shield, AlertTriangle, RefreshCw, Info, Plus, Trash2, Vote, CheckCircle2, Upload, Camera, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { adminApi, type AdminStudentRecord } from "@/lib/api/admin";
import { api } from "@/lib/api/client";
import { COURSES, seatLabel, normalizeCourse } from "@/lib/class-data";
import { CourseSelect } from "@/components/ui/CourseSelect";
import { BatchSelect } from "@/components/ui/BatchSelect";
import type { Section, Year } from "@/lib/class-data";

const DEPARTMENTS = ["All", ...COURSES] as const;
const SEM_OPTIONS = ["All", "1 Sem", "3 Sem", "5 Sem"] as const;
const SECTION_OPTIONS = ["All", "A1", "A2", "A3"] as const;
const ROLES = ["All", "STUDENT", "CANDIDATE", "CAD", "ADMIN"] as const;

type UiStudent = AdminStudentRecord & {
  displayId: string;
  year: string;
  votingStatus: "Voted" | "Not Voted";
};

function getRoleBadgeVariant(role: string): "success" | "error" | "warning" | "info" | "neutral" {
  switch (role) {
    case "ADMIN":
      return "error";
    case "CAD":
      return "info";
    case "CANDIDATE":
      return "warning";
    case "STUDENT":
      return "success";
    default:
      return "neutral";
  }
}

export default function StudentsPage() {
  const [students, setStudents] = useState<UiStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("All");
  const [sem, setSem] = useState<string>("All");
  const [section, setSection] = useState<string>("All");
  const [role, setRole] = useState<string>("All");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedStudent, setSelectedStudent] = useState<UiStudent | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", email: "", department: "", year: "", section: "" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingMobile, setEditingMobile] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(false);
  const [editingOfficialEmail, setEditingOfficialEmail] = useState(false);
  const [editMobile, setEditMobile] = useState("");
  const [editEnrollment, setEditEnrollment] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editOfficialEmail, setEditOfficialEmail] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const profileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const patchStudent = async (
    id: number,
    patch: {
      voting_eligible?: boolean;
      role?: string;
      department?: string;
      year_or_semester?: string;
      section?: string | null;
      name?: string;
      email?: string | null;
      profile_image_url?: string | null;
      mobile_number?: string | null;
      enrollment_number?: string | null;
      student_id?: string | null;
      official_email?: string | null;
    }
  ) => {
    setSaving(true);
    try {
      const res: any = await adminApi.updateStudent(id, patch);
      const updated = res?.data ?? res ?? patch;
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...(updated ?? patch) } : s))
      );
      if (selectedStudent?.id === id) {
        setSelectedStudent((prev) => (prev ? { ...prev, ...(updated ?? patch) } : prev));
      }
      showToast(patch.profile_image_url !== undefined || patch.name !== undefined || patch.email !== undefined ? "Student details updated" : "Student updated", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed. Please try again.");
      showToast(e instanceof Error ? e.message : "Update failed. Please try again.", "error");
    }
    setSaving(false);
  };

  const saveNameEdit = async () => {
    if (!selectedStudent) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast("Name cannot be empty", "error");
      return;
    }
    await patchStudent(selectedStudent.id, { name: trimmed });
    setEditingName(false);
  };

  const saveEmailEdit = async () => {
    if (!selectedStudent) return;
    const trimmed = editEmail.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast("Invalid email format", "error");
      return;
    }
    await patchStudent(selectedStudent.id, { email: trimmed || null });
    setEditingEmail(false);
  };

  const saveMobileEdit = async () => {
    if (!selectedStudent) return;
    const trimmed = editMobile.trim();
    if (trimmed && (trimmed.length > 20 || !/^[0-9+\-\s()]+$/.test(trimmed))) {
      showToast("Invalid mobile number", "error");
      return;
    }
    await patchStudent(selectedStudent.id, { mobile_number: trimmed || null });
    setEditingMobile(false);
  };

  const saveEnrollmentEdit = async () => {
    if (!selectedStudent) return;
    const trimmed = editEnrollment.trim();
    if (trimmed.length > 64) {
      showToast("Enrollment number too long", "error");
      return;
    }
    await patchStudent(selectedStudent.id, { enrollment_number: trimmed || null });
    setEditingEnrollment(false);
  };

  const saveStudentIdEdit = async () => {
    if (!selectedStudent) return;
    const trimmed = editStudentId.trim();
    await patchStudent(selectedStudent.id, { student_id: trimmed || null });
    setEditingStudentId(false);
  };

  const saveOfficialEmailEdit = async () => {
    if (!selectedStudent) return;
    const trimmed = editOfficialEmail.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast("Invalid email format", "error");
      return;
    }
    await patchStudent(selectedStudent.id, { official_email: trimmed || null });
    setEditingOfficialEmail(false);
  };

  const handleProfileImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;
    setUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });
      const res: any = await api.post("/uploads/profile", { image: dataUrl });
      const url = res?.data?.url ?? res?.url;
      if (!url) throw new Error("Upload failed");
      await patchStudent(selectedStudent.id, { profile_image_url: url });
      showToast("Profile image updated", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Upload failed", "error");
    } finally {
      setUploadingImage(false);
      if (profileInputRef.current) profileInputRef.current.value = "";
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.name.trim() || !createForm.department || !createForm.year) {
      setCreateError("Name, Department and Year are required.");
      return;
    }
    setCreating(true);
    try {
      await adminApi.createStudent({
        name: createForm.name.trim(),
        email: createForm.email.trim() || undefined,
        department: createForm.department,
        year_or_semester: createForm.year,
        section: createForm.section || undefined,
      });
      setShowCreate(false);
      setCreateForm({ name: "", email: "", department: "", year: "", section: "" });
      load();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create student.");
    }
    setCreating(false);
  };

  const handleDelete = async (student: UiStudent) => {
    if (!confirm(`Deactivate ${student.name || student.displayId}? They will no longer be able to log in.`)) return;
    setSaving(true);
    try {
      await adminApi.updateStudentStatus(student.id, false);
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, is_active: false } : s))
      );
      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) => (prev ? { ...prev, is_active: false } : prev));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate student.");
    }
    setSaving(false);
  };

  const handleRemove = async (student: UiStudent) => {
    if (!confirm(`PERMANENTLY DELETE ${student.name || student.displayId}?\n\nThis removes the student account, their login sessions and candidate applications entirely. This cannot be undone.`)) return;
    setSaving(true);
    try {
      await adminApi.removeStudent(student.id);
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
      if (selectedStudent?.id === student.id) {
        setSelectedStudent(null);
      }
      showToast(`${student.name || "Student"} deleted permanently`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete student.";
      setError(msg);
      showToast(msg, "error");
    }
    setSaving(false);
  };

  const handleAllowAllToVote = async () => {
    if (!confirm("Set ALL students as voting-eligible? This cannot be undone in bulk.")) return;
    setSaving(true);
    setError("");
    try {
      const res: any = await adminApi.bulkSetVotingEligible(true);
      const updated = res?.updated ?? res?.data?.updated ?? 0;
      setStudents((prev) => prev.map((s) => ({ ...s, voting_eligible: true })));
      showToast(`Updated ${updated} students to voting-eligible.`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update voting eligibility.");
      showToast("Failed to update voting eligibility.", "error");
    }
    setSaving(false);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<{ students?: AdminStudentRecord[] } | AdminStudentRecord[]>("/admin/students?limit=5000");
      const rows: AdminStudentRecord[] = Array.isArray(res)
        ? res
        : ((res as { students?: AdminStudentRecord[] }).students as AdminStudentRecord[]) ||
          ((res as unknown as AdminStudentRecord[]) ?? []);
      setStudents(
        (rows || []).map((s, i) => ({
          ...s,
          displayId: s.student_id || s.email || `#${s.id ?? i + 1}`,
          year: s.role === "STUDENT" ? "— " : "—",
          votingStatus: "Not Voted" as const,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load students. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.toLowerCase();
      if (
        search &&
        !s.name?.toLowerCase().includes(q) &&
        !s.displayId.toLowerCase().includes(q) &&
        !s.email?.toLowerCase().includes(q)
      )
        return false;
      const sDept = normalizeCourse((s as { department?: string }).department) || (s as { department?: string }).department || "";
      if (department !== "All" && normalizeCourse(department) !== normalizeCourse(sDept)) return false;
      if (sem !== "All" && (s as { year_or_semester?: string }).year_or_semester !== sem) return false;
      if (section !== "All" && (s as { section?: string }).section !== section) return false;
      if (role !== "All" && s.role !== role) return false;
      if (activeFilter === "Active" && !s.is_active) return false;
      if (activeFilter === "Inactive" && s.is_active) return false;
      return true;
    });
  }, [students, search, department, sem, section, role, activeFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Student Management
            </h1>
            <p className="text-sm font-semibold text-text-secondary">
              Real accounts from the database.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleAllowAllToVote} disabled={saving} className="gap-1.5">
              <Vote className="w-3.5 h-3.5" />
              Allow All to Vote
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              New Student
            </Button>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5" disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Card className="p-4 flex items-center gap-3 border-error-200 bg-error-50">
            <AlertTriangle className="w-5 h-5 text-error-500" />
            <p className="text-sm text-error-600">{error}</p>
          </Card>
        )}

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="relative lg:col-span-1 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, ID or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Courses" : d}
                </option>
              ))}
            </select>
            <select
              value={sem}
              onChange={(e) => setSem(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer"
            >
              {SEM_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y === "All" ? "All Batches" : y}
                </option>
              ))}
            </select>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer"
            >
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All Sections" : `Section ${s}`}
                </option>
              ))}
            </select>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r === "All" ? "All Roles" : r}
                </option>
              ))}
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer"
            >
              <option value="All">All Account Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </Card>

        {loading ? (
          <Card className="p-12 text-center text-text-secondary">Loading students…</Card>
        ) : filteredStudents.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-text-primary">No Students Found</h3>
            <p className="text-sm text-text-secondary mt-1">
              {students.length === 0
                ? "No student accounts exist yet. Accounts are created when students sign in with Google or are approved via access requests."
                : "No students match your current filters."}
            </p>
          </Card>
        ) : (
          <>
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Student ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Class</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Role</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Account</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Voting</th>
                      <th className="text-right px-4 py-3 font-semibold text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr
                        key={student.id ?? student.displayId}
                        className="border-b border-border last:border-0 hover:bg-bg-tertiary/50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{student.displayId}</td>
                        <td className="px-4 py-3 font-medium text-text-primary">{student.name || "—"}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {[normalizeCourse((student as { department?: string }).department) || (student as { department?: string }).department, (student as { year_or_semester?: string }).year_or_semester, (student as { section?: string }).section].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={getRoleBadgeVariant(student.role)} size="sm">
                            {student.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={student.is_active ? "success" : "error"} size="sm">
                            {student.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={student.voting_eligible ? "success" : "neutral"} size="sm">
                            {student.voting_eligible ? "Eligible" : "Not Eligible"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStudent(student)}
                            className="gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="md:hidden space-y-3">
              {filteredStudents.map((student) => (
                <Card key={student.id ?? student.displayId} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-text-muted mb-0.5">{student.displayId}</p>
                      <p className="font-semibold text-text-primary">{student.name || "—"}</p>
                      <p className="text-sm text-text-secondary">{student.email || "—"}</p>
                      <p className="text-xs text-text-muted mt-1">
                        {[normalizeCourse((student as { department?: string }).department) || (student as { department?: string }).department, (student as { year_or_semester?: string }).year_or_semester, (student as { section?: string }).section].filter(Boolean).join(" / ") || "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStudent(student)}
                      className="gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getRoleBadgeVariant(student.role)} size="sm">
                      {student.role}
                    </Badge>
                    <Badge variant={student.is_active ? "success" : "error"} size="sm">
                      {student.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between text-sm text-text-secondary">
              <p>
                Showing <span className="font-semibold text-text-primary">{filteredStudents.length}</span> of{" "}
                <span className="font-semibold text-text-primary">{students.length}</span> accounts
              </p>
            </div>
          </>
        )}

        <Modal isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} title="Student Details">
          {selectedStudent && (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="relative">
                    {selectedStudent.profile_image_url ? (
                      <img
                        src={selectedStudent.profile_image_url}
                        alt={selectedStudent.name || "Student"}
                        className="w-16 h-16 rounded-full object-cover border border-border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-bg-tertiary border border-border flex items-center justify-center">
                        <Camera className="w-6 h-6 text-text-muted" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => profileInputRef.current?.click()}
                      disabled={saving || uploadingImage}
                      className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary-600 text-white shadow-md hover:bg-primary-700 transition-colors disabled:opacity-50"
                      title="Upload profile image"
                    >
                      {uploadingImage ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    className="hidden"
                    onChange={handleProfileImage}
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-mono text-xs text-text-muted">{selectedStudent.displayId}</p>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <Button size="sm" disabled={saving} onClick={saveNameEdit}>Save</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-text-primary truncate">{selectedStudent.name || "—"}</p>
                      <button
                        type="button"
                        onClick={() => { setEditName(selectedStudent.name || ""); setEditingName(true); }}
                        className="p-1 text-text-muted hover:text-primary-600 transition-colors"
                        title="Edit name"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {editingEmail ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                        autoFocus
                      />
                      <Button size="sm" disabled={saving} onClick={saveEmailEdit}>Save</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-text-secondary truncate">{selectedStudent.email || "No email on record"}</p>
                      <button
                        type="button"
                        onClick={() => { setEditEmail(selectedStudent.email || ""); setEditingEmail(true); }}
                        className="p-1 text-text-muted hover:text-primary-600 transition-colors"
                        title="Edit email"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="py-2 border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1.5">Contact & ID</p>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-text-secondary">Mobile</span>
                    {editingMobile ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editMobile}
                          onChange={(e) => setEditMobile(e.target.value)}
                          className="w-40 px-2 py-1 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                        <Button size="sm" disabled={saving} onClick={saveMobileEdit}>Save</Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditMobile(selectedStudent.mobile_number || ""); setEditingMobile(true); }}
                        className="flex items-center gap-2 text-sm text-text-primary hover:text-primary-600 transition-colors"
                        title="Edit mobile number"
                      >
                        <span>{selectedStudent.mobile_number || "—"}</span>
                        <Pencil className="w-3.5 h-3.5 text-text-muted" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-text-secondary">Enrollment No.</span>
                    {editingEnrollment ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editEnrollment}
                          onChange={(e) => setEditEnrollment(e.target.value)}
                          className="w-40 px-2 py-1 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                        <Button size="sm" disabled={saving} onClick={saveEnrollmentEdit}>Save</Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditEnrollment(selectedStudent.enrollment_number || ""); setEditingEnrollment(true); }}
                        className="flex items-center gap-2 text-sm text-text-primary hover:text-primary-600 transition-colors"
                        title="Edit enrollment number"
                      >
                        <span>{selectedStudent.enrollment_number || "—"}</span>
                        <Pencil className="w-3.5 h-3.5 text-text-muted" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-text-secondary">Student ID</span>
                    {editingStudentId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editStudentId}
                          onChange={(e) => setEditStudentId(e.target.value)}
                          className="w-40 px-2 py-1 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                        <Button size="sm" disabled={saving} onClick={saveStudentIdEdit}>Save</Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditStudentId(selectedStudent.student_id || ""); setEditingStudentId(true); }}
                        className="flex items-center gap-2 text-sm text-text-primary hover:text-primary-600 transition-colors"
                        title="Edit student ID"
                      >
                        <span>{selectedStudent.student_id || "—"}</span>
                        <Pencil className="w-3.5 h-3.5 text-text-muted" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-text-secondary">Official Email</span>
                    {editingOfficialEmail ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={editOfficialEmail}
                          onChange={(e) => setEditOfficialEmail(e.target.value)}
                          className="w-40 px-2 py-1 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                          autoFocus
                        />
                        <Button size="sm" disabled={saving} onClick={saveOfficialEmailEdit}>Save</Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditOfficialEmail(selectedStudent.official_email || ""); setEditingOfficialEmail(true); }}
                        className="flex items-center gap-2 text-sm text-text-primary hover:text-primary-600 transition-colors"
                        title="Edit official email"
                      >
                        <span className="truncate max-w-[180px]">{selectedStudent.official_email || "—"}</span>
                        <Pencil className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Role</span>
                  <select
                    value={selectedStudent.role}
                    disabled={saving}
                    onChange={(e) => patchStudent(selectedStudent.id, { role: e.target.value })}
                    className="px-2.5 py-1.5 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {["STUDENT", "CANDIDATE", "CAD", "ADMIN"].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Account Status</span>
                  <Badge variant={selectedStudent.is_active ? "success" : "error"} size="sm">
                    {selectedStudent.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Voting Eligibility</span>
                  {typeof selectedStudent.voting_eligible === "boolean" ? (
                    <Button
                      variant={selectedStudent.voting_eligible ? "outline" : "primary"}
                      size="sm"
                      disabled={saving}
                      onClick={() =>
                        patchStudent(selectedStudent.id, { voting_eligible: !selectedStudent.voting_eligible })
                      }
                    >
                      {selectedStudent.voting_eligible ? "Revoke" : "Grant"}
                    </Button>
                  ) : (
                    <Badge variant="neutral" size="sm">Unknown</Badge>
                  )}
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Course</span>
                  <div className="w-44">
                    <CourseSelect
                      id="student-course"
                      value={normalizeCourse(selectedStudent.department ?? selectedStudent.applied_department)}
                      disabled={saving}
                      showDefault={false}
                      onChange={(c) => {
                        if (!c) return;
                        patchStudent(selectedStudent.id, { department: c });
                        setSelectedStudent((prev) =>
                          prev
                            ? {
                                ...prev,
                                department: c,
                                year_or_semester: "",
                                section: "",
                              }
                            : prev
                        );
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Batch</span>
                  <div className="w-44">
                    <BatchSelect
                      id="student-batch"
                      course={normalizeCourse(selectedStudent.department ?? selectedStudent.applied_department)}
                      value={{
                        section: (selectedStudent.section ?? selectedStudent.applied_section ?? "") as Section,
                        year: (selectedStudent.year_or_semester ?? selectedStudent.applied_year ?? "") as Year,
                      }}
                      disabled={saving}
                      showDefault={false}
                      onChange={(b) => {
                        patchStudent(selectedStudent.id, {
                          year_or_semester: b.year,
                          section: b.section || null,
                        });
                        setSelectedStudent((prev) =>
                          prev
                            ? { ...prev, year_or_semester: b.year, section: b.section || null }
                            : prev
                        );
                      }}
                    />
                  </div>
                </div>

                {(selectedStudent.applied_section || selectedStudent.applied_department || selectedStudent.applied_year) && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-bg-tertiary border border-border">
                    <Info className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-text-secondary leading-relaxed">
                      This student&apos;s Class Representative application registered{" "}
                      <span className="font-medium text-text-primary">
                        {seatLabel(selectedStudent.applied_department || "", selectedStudent.applied_year || "", selectedStudent.applied_section)}
                      </span>
                      . Empty fields above will use it to resolve their CR seat.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-50 border border-primary-100">
                <Shield className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary-700 leading-relaxed">
                  Changes take effect immediately and are audit-logged. You cannot change your own role.
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleDelete(selectedStudent)}
                    className="gap-1.5 text-error-600 border-error-200 hover:bg-error-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Deactivate
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={saving}
                    onClick={() => handleRemove(selectedStudent)}
                    className="gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Forever
                  </Button>
                </div>
                <Button variant="secondary" onClick={() => setSelectedStudent(null)} className="gap-1.5">
                  <X className="w-4 h-4" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Student">
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 border border-error-200">
                <AlertTriangle className="w-4 h-4 text-error-500" />
                <p className="text-sm text-error-600">{createError}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="e.g. john@college.edu"
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Department *</label>
                <select
                  value={createForm.department}
                  onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="">—</option>
                  {COURSES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Year *</label>
                <select
                  value={createForm.year}
                  onChange={(e) => setCreateForm((f) => ({ ...f, year: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="">—</option>
                  {["1 Sem", "3 Sem", "5 Sem"].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Section</label>
                <select
                  value={createForm.section}
                  onChange={(e) => setCreateForm((f) => ({ ...f, section: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                >
                  <option value="">—</option>
                  {["A1", "A2", "A3"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowCreate(false)} disabled={creating}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={creating} className="gap-1.5">
                {creating ? "Creating…" : "Create Student"}
              </Button>
            </div>
          </form>
        </Modal>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === "success"
                ? "bg-success-50 text-success-700 border border-success-200"
                : "bg-error-50 text-error-700 border border-error-200"
            }`}>
              {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {toast.message}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
