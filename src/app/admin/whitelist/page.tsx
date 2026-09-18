"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, RefreshCw, Plus, Pencil, Trash2, Shield, Mail, AlertTriangle, CheckCircle2, X, Filter } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { adminApi, type AdminStudentRecord } from "@/lib/api/admin";
import { COURSES } from "@/lib/class-data";

const YEAR_OPTIONS = ["All", "1 Sem", "3 Sem", "5 Sem"] as const;
const DEPARTMENTS = ["All", ...COURSES] as const;
const SECTION_OPTIONS = ["All", "A1", "A2", "A3"] as const;
const REGISTERED_OPTIONS = ["All", "Pending", "Registered"] as const;
const SECTION_LESS_COURSES = new Set(["BCOM", "MBA", "MCA"]);

type WhitelistRow = AdminStudentRecord & {
  is_registered?: boolean;
  official_email?: string;
  current_login_email?: string;
  external_id?: string;
  student_id?: string;
};

export default function WhitelistPage() {
  const [rows, setRows] = useState<WhitelistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [year, setYear] = useState("All");
  const [section, setSection] = useState("All");
  const [regFilter, setRegFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const [selected, setSelected] = useState<WhitelistRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", department: "", year_or_semester: "", section: "" });
  const [editError, setEditError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", department: "BBA", year_or_semester: "1 Sem", section: "A1" });
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async (pageNum = 1) => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page: pageNum, limit };
      if (search.trim()) params.search = search.trim();
      if (department !== "All") params.department = department;
      if (year !== "All") params.year_or_semester = year;
      if (section !== "All") params.section = section;
      if (regFilter === "Registered") params.is_registered = "true";
      if (regFilter === "Pending") params.is_registered = "false";

      const res: any = await adminApi.getWhitelist(params as any);
      const data = res?.data?.data ?? res?.data ?? res;
      const list: WhitelistRow[] = data?.whitelist ?? data?.data?.whitelist ?? (Array.isArray(data) ? data : []) ?? [];
      const pagination = data?.pagination ?? data?.data?.pagination ?? { total: list.length, totalPages: 1, page: pageNum, limit };
      setRows(Array.isArray(list) ? list : []);
      setTotal(pagination.total ?? list.length ?? 0);
      setTotalPages(pagination.totalPages ?? 1);
      setPage(pagination.page ?? pageNum);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load whitelist.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const openEdit = (row: WhitelistRow) => {
    setSelected(row);
    setEditForm({
      name: row.name || "",
      email: row.email || row.official_email || row.current_login_email || "",
      department: row.department || "",
      year_or_semester: row.year_or_semester || "",
      section: row.section || "",
    });
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setEditError("");
    if (!editForm.name.trim() || editForm.name.trim().length < 2) {
      setEditError("Name must be at least 2 characters.");
      return;
    }
    if (!editForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      setEditError("Valid email is required.");
      return;
    }
    setSaving(true);
    try {
      const patch: any = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
      };
      // Only send department/year/section if changed or non-empty - backend handles NULL for empty
      patch.department = editForm.department.trim() || null;
      patch.year_or_semester = editForm.year_or_semester.trim() || null;
      patch.section = editForm.section.trim() ? editForm.section.trim().toUpperCase() : null;

      const res: any = await adminApi.updateWhitelist(selected.id, patch);
      const updated = res?.data ?? res;
      setRows(prev => prev.map(r => r.id === selected.id ? { ...r, ...patch, email: patch.email, official_email: patch.email, current_login_email: patch.email } : r));
      setSelected(null);
      showToast("Whitelist entry updated.", "success");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update. Email may already exist.");
    }
    setSaving(false);
  };

  const handleDelete = async (row: WhitelistRow) => {
    const isRegistered = (row as any).is_registered;
    const msg = isRegistered
      ? `Deactivate ${row.name} (${row.email})? They have already registered — they will be deactivated but not deleted.`
      : `Delete whitelisted ${row.name} (${row.email})? They will no longer be able to register.`;
    if (!confirm(msg)) return;
    try {
      await adminApi.deleteWhitelist(row.id);
      setRows(prev => prev.filter(r => r.id !== row.id));
      setTotal(t => t - 1);
      showToast(isRegistered ? "Account deactivated." : "Whitelist entry deleted.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete.");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    if (!addForm.name.trim() || addForm.name.trim().length < 2) {
      setAddError("Name must be at least 2 characters.");
      return;
    }
    if (!addForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email.trim())) {
      setAddError("Valid email is required.");
      return;
    }
    setAdding(true);
    try {
      const res: any = await adminApi.createWhitelist({
        name: addForm.name.trim(),
        email: addForm.email.trim().toLowerCase(),
        department: addForm.department || undefined,
        year_or_semester: addForm.year_or_semester || undefined,
        section: addForm.section || undefined,
      });
      setShowAdd(false);
      setAddForm({ name: "", email: "", department: "BBA", year_or_semester: "1 Sem", section: "A1" });
      showToast("Whitelisted email added.", "success");
      load(1);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add. Email may already exist.");
    }
    setAdding(false);
  };

  const stats = useMemo(() => {
    const registered = rows.filter(r => (r as any).is_registered).length;
    const pending = rows.length - registered;
    return { registered, pending };
  }, [rows]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-600" />
              Whitelist Management
            </h1>
            <p className="text-sm font-medium text-text-secondary mt-1">
              Only these <span className="font-bold text-text-primary">{total}</span> whitelisted emails can register. Imported from Excel (1227) — admins can view, edit, add or remove.
            </p>
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Edits only via admin — students cannot change their whitelisted email themselves.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => setShowAdd(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Email
            </Button>
            <Button variant="outline" size="sm" onClick={() => load(page)} disabled={loading} className="gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
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
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search name, email, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </div>
            <select value={department} onChange={e => setDepartment(e.target.value)} className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d === "All" ? "All Depts" : d}</option>)}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)} className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y === "All" ? "All Sem" : y}</option>)}
            </select>
            <select value={section} onChange={e => setSection(e.target.value)} className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
              {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s === "All" ? "All Sec" : s}</option>)}
            </select>
            <select value={regFilter} onChange={e => setRegFilter(e.target.value)} className="px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer">
              {REGISTERED_OPTIONS.map(r => <option key={r} value={r}>{r === "All" ? "All Status" : r}</option>)}
            </select>
          </form>
          <div className="flex items-center gap-2 mt-3">
            <Button variant="primary" size="sm" onClick={() => load(1)} className="gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Apply
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setDepartment("All"); setYear("All"); setSection("All"); setRegFilter("All"); setTimeout(() => load(1), 50); }}>
              Clear
            </Button>
            <span className="text-xs text-text-muted ml-auto">
              Showing {rows.length} of {total} {regFilter !== "All" ? `(${regFilter})` : ""} {loading ? "— loading…" : ""}
            </span>
          </div>
        </Card>

        {loading ? (
          <Card className="p-12 text-center text-text-secondary">Loading whitelist…</Card>
        ) : rows.length === 0 ? (
          <Card className="p-12 text-center">
            <Mail className="w-10 h-10 text-text-muted mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-text-primary">No whitelisted emails</h3>
            <p className="text-sm text-text-secondary mt-1">No entries match your filters. Try clearing filters or adding a new email.</p>
          </Card>
        ) : (
          <>
            <Card className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-bg-tertiary/50">
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Student ID</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Email (whitelisted)</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Class</th>
                      <th className="text-left px-4 py-3 font-semibold text-text-secondary">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.id} className="border-b border-border last:border-0 hover:bg-bg-tertiary/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-text-secondary">{row.student_id || row.external_id || `#${row.id}`}</td>
                        <td className="px-4 py-3 font-medium text-text-primary">{row.name}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          <span className="font-mono text-xs">{row.email || row.official_email || row.current_login_email || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {[row.department, row.year_or_semester, row.section].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant={(row as any).is_registered ? "success" : "warning"} size="sm">
                              {(row as any).is_registered ? "Registered" : "Pending"}
                            </Badge>
                            <Badge variant={row.is_active ? "success" : "error"} size="sm">
                              {row.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(row)} className="gap-1">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} className="gap-1 text-error-600 hover:bg-error-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="md:hidden space-y-3">
              {rows.map(row => (
                <Card key={row.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-xs text-text-muted">{row.student_id || row.external_id}</p>
                      <p className="font-semibold text-text-primary">{row.name}</p>
                      <p className="text-xs font-mono text-text-secondary break-all">{row.email}</p>
                      <p className="text-xs text-text-muted mt-1">{[row.department, row.year_or_semester, row.section].filter(Boolean).join(" / ")}</p>
                    </div>
                    <Badge variant={(row as any).is_registered ? "success" : "warning"} size="sm">
                      {(row as any).is_registered ? "Reg" : "Pend"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(row)} className="flex-1 gap-1">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} className="gap-1 text-error-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Page <span className="font-semibold text-text-primary">{page}</span> of <span className="font-semibold text-text-primary">{totalPages}</span> — {total} total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}

        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Edit Whitelisted Email">
          {selected && (
            <form onSubmit={handleEdit} className="space-y-4">
              {editError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 border border-error-200">
                  <AlertTriangle className="w-4 h-4 text-error-500" />
                  <p className="text-sm text-error-600">{editError}</p>
                </div>
              )}
              <div className="p-3 rounded-xl bg-primary-50 border border-primary-100 flex gap-2">
                <Shield className="w-4 h-4 text-primary-600 mt-0.5" />
                <p className="text-xs text-primary-700">Admin-only: changing the email updates the whitelist. The student will need to register/sign-in with the new address. Audit-logged.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Student ID</label>
                <input value={selected.student_id || selected.external_id || ""} disabled className="w-full px-3 py-2.5 text-sm bg-bg-tertiary border border-border rounded-xl text-text-muted" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Full Name *</label>
                <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Student name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Email (whitelisted) *</label>
                <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="student@college.edu" />
                <p className="text-xs text-text-muted mt-1">Only this address can register. Changing it revokes the old address.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Dept</label>
                  <select value={editForm.department} onChange={e => {
                    const newDept = e.target.value;
                    setEditForm(f => ({ ...f, department: newDept, section: SECTION_LESS_COURSES.has(newDept.toUpperCase()) ? "" : f.section }));
                  }} className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">—</option>
                    {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Sem</label>
                  <select value={editForm.year_or_semester} onChange={e => setEditForm(f => ({ ...f, year_or_semester: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="">—</option>
                    <option value="1 Sem">1 Sem</option>
                    <option value="3 Sem">3 Sem</option>
                    <option value="5 Sem">5 Sem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">Sec</label>
                  <select value={editForm.section} onChange={e => setEditForm(f => ({ ...f, section: e.target.value }))} disabled={SECTION_LESS_COURSES.has(editForm.department.toUpperCase())} className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-bg-tertiary disabled:text-text-muted">
                    <option value="">—</option>
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="A3">A3</option>
                  </select>
                  {SECTION_LESS_COURSES.has(editForm.department.toUpperCase()) && <p className="text-xs text-text-muted mt-1">No section for {editForm.department}</p>}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" type="button" onClick={() => setSelected(null)} disabled={saving}>Cancel</Button>
                <Button variant="primary" type="submit" disabled={saving} className="gap-1.5">
                  {saving ? "Saving…" : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>}
                </Button>
              </div>
            </form>
          )}
        </Modal>

        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Whitelisted Email">
          <form onSubmit={handleAdd} className="space-y-4">
            {addError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-error-50 border border-error-200">
                <AlertTriangle className="w-4 h-4 text-error-500" />
                <p className="text-sm text-error-600">{addError}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Full Name *</label>
              <Input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Email *</label>
              <Input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="john@college.edu" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Dept</label>
                <select value={addForm.department} onChange={e => {
                  const newDept = e.target.value;
                  setAddForm(f => ({ ...f, department: newDept, section: SECTION_LESS_COURSES.has(newDept.toUpperCase()) ? "" : f.section }));
                }} className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl">
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="">—</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Sem</label>
                <select value={addForm.year_or_semester} onChange={e => setAddForm(f => ({ ...f, year_or_semester: e.target.value }))} className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl">
                  <option value="1 Sem">1 Sem</option>
                  <option value="3 Sem">3 Sem</option>
                  <option value="5 Sem">5 Sem</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Sec</label>
                <select value={addForm.section} onChange={e => setAddForm(f => ({ ...f, section: e.target.value }))} disabled={SECTION_LESS_COURSES.has(addForm.department.toUpperCase())} className="w-full px-3 py-2.5 text-sm bg-white border border-border rounded-xl disabled:bg-bg-tertiary disabled:text-text-muted">
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="A3">A3</option>
                  <option value="">—</option>
                </select>
                {SECTION_LESS_COURSES.has(addForm.department.toUpperCase()) && <p className="text-xs text-text-muted mt-1">No section</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setShowAdd(false)} disabled={adding}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={adding} className="gap-1.5">
                {adding ? "Adding…" : <><Plus className="w-4 h-4" /> Add to Whitelist</>}
              </Button>
            </div>
          </form>
        </Modal>

        {toast && (
          <div className="fixed bottom-6 right-6 z-50">
            <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-success-50 text-success-700 border border-success-200" : "bg-error-50 text-error-700 border border-error-200"}`}>
              {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />} {toast.message}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
