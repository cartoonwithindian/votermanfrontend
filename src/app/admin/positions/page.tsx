"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { api } from "@/lib/api/client";
import { seatLabel } from "@/lib/class-data";
import {
  RefreshCw,
  Users,
  Inbox,
  Pencil,
  X,
} from "lucide-react";

// Approved CR application (matches backend ApprovedCandidateRow)
interface CRCandidate {
  id: number | string;
  student_id: number | string | null;
  full_name: string;
  gender: string;
  department: string;
  year: string;
  section: string | null;
  position_id: number | string | null;
  position_name: string | null;
  category: string;
  photo: string | null;
  status: string;
}

type Seat = "boys" | "girls";

function seatOf(c: CRCandidate): Seat {
  const n = (c.position_name || "").toLowerCase();
  if (n.includes("girl")) return "girls";
  if (n.includes("boy")) return "boys";
  return c.gender === "Female" ? "girls" : "boys";
}

interface ClassGroup {
  key: string;
  department: string;
  year: string;
  section: string;
  label: string;
  boys: CRCandidate[];
  girls: CRCandidate[];
}

export default function PositionsPage() {
  const [candidates, setCandidates] = useState<CRCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");

  // Edit candidate modal
  const [editing, setEditing] = useState<CRCandidate | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", photo: "", manifesto: "" });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      // CR approved applications (club applications excluded below):
      // GET /api/v1/admin/candidate-applications/approved
      const response = await api.get<{ data: CRCandidate[] }>(`/admin/candidate-applications/approved`);
      const data = Array.isArray(response) ? response : (response.data || []);
      setCandidates(data.filter((c) => c.category !== "CLUB"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Class Representative seats");
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEdit = (c: CRCandidate) => {
    setEditing(c);
    setEditForm({ full_name: c.full_name, photo: c.photo || "", manifesto: "" });
    setEditError("");
  };

  const closeEdit = () => {
    setEditing(null);
    setSaving(false);
    setEditError("");
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editForm.full_name.trim()) {
      setEditError("Candidate name is required");
      return;
    }
    setSaving(true);
    setEditError("");
    try {
      await api.patch(`/admin/candidates/${editing.id}`, {
        name: editForm.full_name.trim(),
        image_url: editForm.photo.trim() || null,
        description: editForm.manifesto.trim() || null,
      });
      closeEdit();
      await load();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update candidate");
    } finally {
      setSaving(false);
    }
  };

  const uniqueClasses = useMemo(
    () => [...new Set(candidates.map((c) => c.department).filter(Boolean))].sort(),
    [candidates]
  );
  const uniqueSections = useMemo(
    () => [...new Set(candidates.map((c) => c.section).filter(Boolean) as string[])].sort(),
    [candidates]
  );
  const hasSectionless = useMemo(
    () => candidates.some((c) => !c.section),
    [candidates]
  );

  // Group CR candidates class-wise (course + year + section), seats boys/girls-wise
  const groups: ClassGroup[] = useMemo(() => {
    const map = new Map<string, ClassGroup>();
    for (const c of candidates) {
      if (filterClass !== "all" && c.department !== filterClass) continue;
      if (filterSection === "__none") {
        if (c.section) continue;
      } else if (filterSection !== "all" && c.section !== filterSection) {
        continue;
      }
      const section = c.section || "";
      const key = `${c.department}|||${c.year}|||${section}`;
      let g = map.get(key);
      if (!g) {
        g = {
          key,
          department: c.department,
          year: c.year,
          section,
          label: seatLabel(c.department, c.year, section),
          boys: [],
          girls: [],
        };
        map.set(key, g);
      }
      g[seatOf(c)].push(c);
    }
    return [...map.values()].sort((a, b) =>
      (a.department + a.year + a.section).localeCompare(b.department + b.year + b.section)
    );
  }, [candidates, filterClass, filterSection]);

  const totalCount = groups.reduce((n, g) => n + g.boys.length + g.girls.length, 0);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Class Representative Seats</h1>
            <p className="text-sm text-gray-600 mt-1">
              CR classes course-wise and section-wise, with Boys and Girls seats
            </p>
          </div>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
            {error}
          </div>
        )}

        {/* Class Filters */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[140px]">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Class
                </label>
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Classes</option>
                  {uniqueClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[100px]">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Section
                </label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  {uniqueSections.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec}
                    </option>
                  ))}
                  {hasSectionless && <option value="__none">No section</option>}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>
                {loading ? "Loading..." : `${totalCount} CR candidates in ${groups.length} classes`}
              </span>
            </div>
          </div>
        </Card>

        {/* Class-wise CR seats */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((g) => (
              <Card key={g.key}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-gray-900">{g.label}</h2>
                    <Badge variant="info">
                      {g.boys.length + g.girls.length} candidate{(g.boys.length + g.girls.length) !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(
                      [
                        { seat: "boys" as Seat, title: "Boys", members: g.boys },
                        { seat: "girls" as Seat, title: "Girls", members: g.girls },
                      ]
                    ).map(({ title, members }) => (
                      <div key={title} className="rounded-xl border border-gray-200 p-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                          {title} — Class Representative
                        </p>
                        {members.length === 0 ? (
                          <p className="text-sm text-gray-400">No candidates</p>
                        ) : (
                          <ul className="space-y-2">
                            {members.map((c) => (
                              <li key={c.id} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  {c.photo ? (
                                    <img
                                      src={c.photo}
                                      alt={c.full_name}
                                      className="w-8 h-8 rounded-full object-cover shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm shrink-0">
                                      {c.full_name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="font-medium text-gray-900 text-sm truncate">
                                    {c.full_name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {c.position_id ? (
                                    <Badge variant="info" className="shrink-0">On ballot</Badge>
                                  ) : (
                                    <Badge variant="neutral" className="shrink-0">Not placed</Badge>
                                  )}
                                  <button
                                    onClick={() => openEdit(c)}
                                    className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                    title="Edit candidate"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="p-8 text-center text-gray-500">
              <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No Class Representative candidates found matching your filters.</p>
            </div>
          </Card>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeEdit} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Edit Candidate</h2>
              <button onClick={closeEdit} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Photo URL
                </label>
                <input
                  type="text"
                  value={editForm.photo}
                  onChange={(e) => setEditForm((f) => ({ ...f, photo: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {editing.photo && (
                  <img src={editing.photo} alt={editing.full_name} className="mt-2 w-12 h-12 rounded-full object-cover border border-gray-200" />
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Manifesto
                </label>
                <textarea
                  value={editForm.manifesto}
                  onChange={(e) => setEditForm((f) => ({ ...f, manifesto: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {editError && (
                <p className="text-sm text-red-600">{editError}</p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" type="button" onClick={closeEdit}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={saving}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
