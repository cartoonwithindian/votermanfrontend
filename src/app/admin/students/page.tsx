"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, Eye, X, Shield, AlertTriangle, RefreshCw, Info, Plus, Trash2, Vote, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { adminApi, type AdminStudentRecord } from "@/lib/api/admin";

const DEPARTMENTS = ["All", "BCA", "BBA", "BCOM", "MCA", "MBA"] as const;
const ROLES = ["All", "STUDENT", "CANDIDATE", "CAD", "ADMIN"] as const;

const SECTION_OPTIONS = ["A", "B", "C", "D", "E", "F"] as const;
const YEAR_OPTIONS = ["1st Year", "2nd Year", "3rd Year", "4th Year"] as const;
const DEPARTMENT_OPTIONS = ["BBA", "BCA", "BCOM", "MBA", "MCA"] as const;

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
  const [role, setRole] = useState<string>("All");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedStudent, setSelectedStudent] = useState<UiStudent | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ external_id: "", name: "", email: "" });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const patchStudent = async (
    id: number,
    patch: {
      voting_eligible?: boolean;
      role?: string;
      department?: string;
      year_or_semester?: string;
      section?: string | null;
    }
  ) => {
    setSaving(true);
    try {
      const res = await adminApi.updateStudent(id, patch);
      const updated = res?.data;
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...(updated ?? patch) } : s))
      );
      if (selectedStudent?.id === id) {
        setSelectedStudent((prev) => (prev ? { ...prev, ...(updated ?? patch) } : prev));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed. Please try again.");
    }
    setSaving(false);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.external_id.trim() || !createForm.name.trim()) {
      setCreateError("Student ID and Name are required.");
      return;
    }
    setCreating(true);
    try {
      await adminApi.createStudent({
        external_id: createForm.external_id.trim(),
        name: createForm.name.trim(),
        email: createForm.email.trim() || undefined,
      });
      setShowCreate(false);
      setCreateForm({ external_id: "", name: "", email: "" });
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

  const handleAllowAllToVote = async () => {
    if (!confirm("Set ALL students as voting-eligible? This cannot be undone in bulk.")) return;
    setSaving(true);
    setError("");
    try {
      const res = await adminApi.bulkSetVotingEligible(true);
      const updated = res?.data?.updated ?? 0;
      setStudents((prev) => prev.map((s) => ({ ...s, voting_eligible: true })));
      showToast(`Updated ${updated} students to voting-eligible.`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update voting eligibility.");
    }
    setSaving(false);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApi.getStudents();
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
      if (department !== "All" && (s as { department?: string }).department !== department)
        return false;
      if (role !== "All" && s.role !== role) return false;
      if (activeFilter === "Active" && !s.is_active) return false;
      if (activeFilter === "Inactive" && s.is_active) return false;
      return true;
    });
  }, [students, search, department, role, activeFilter]);

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative lg:col-span-2">
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
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Email</th>
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
                        <td className="px-4 py-3 text-text-secondary">{student.email || "—"}</td>
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
              <div className="space-y-1">
                <p className="font-mono text-xs text-text-muted">{selectedStudent.displayId}</p>
                <p className="text-lg font-bold text-text-primary">{selectedStudent.name || "—"}</p>
                <p className="text-sm text-text-secondary">{selectedStudent.email || "No email on record"}</p>
              </div>

              <div className="space-y-3">
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
                  <span className="text-sm text-text-secondary">Department</span>
                  <select
                    value={(selectedStudent.department ?? selectedStudent.applied_department) || ""}
                    disabled={saving}
                    onChange={(e) => patchStudent(selectedStudent.id, { department: e.target.value })}
                    className="px-2.5 py-1.5 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <option value="">—</option>
                    {DEPARTMENT_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Year</span>
                  <select
                    value={(selectedStudent.year_or_semester ?? selectedStudent.applied_year) || ""}
                    disabled={saving}
                    onChange={(e) => patchStudent(selectedStudent.id, { year_or_semester: e.target.value })}
                    className="px-2.5 py-1.5 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <option value="">—</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-text-secondary">Section</span>
                  <select
                    value={(selectedStudent.section ?? selectedStudent.applied_section) || ""}
                    disabled={saving}
                    onChange={(e) =>
                      patchStudent(selectedStudent.id, { section: e.target.value ? e.target.value : null })
                    }
                    className="px-2.5 py-1.5 text-sm bg-white border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <option value="">—</option>
                    {SECTION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {(selectedStudent.applied_section || selectedStudent.applied_department || selectedStudent.applied_year) && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-bg-tertiary border border-border">
                    <Info className="w-4 h-4 text-primary-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-text-secondary leading-relaxed">
                      This student&apos;s Class Representative application registered{" "}
                      <span className="font-medium text-text-primary">
                        {[selectedStudent.applied_department, selectedStudent.applied_year, selectedStudent.applied_section]
                          .filter(Boolean)
                          .join(" ")}
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
              <label className="block text-sm font-medium text-text-secondary mb-1">Student ID *</label>
              <input
                type="text"
                value={createForm.external_id}
                onChange={(e) => setCreateForm((f) => ({ ...f, external_id: e.target.value }))}
                placeholder="e.g. 2024001"
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
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
              <label className="block text-sm font-medium text-text-secondary mb-1">Email (optional)</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="e.g. john@college.edu"
                className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
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
