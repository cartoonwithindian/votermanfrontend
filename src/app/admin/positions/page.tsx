"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { adminApi, type AdminPositionRecord, type ApprovedCandidateRow } from "@/lib/api/admin";
import { api } from "@/lib/api/client";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertTriangle,
  Inbox,
  Users,
  Filter,
} from "lucide-react";

// Candidate data from approved applications (matches backend ApprovedCandidateRow)
interface PositionCandidate {
  id: number;
  student_id: number;
  full_name: string;
  gender: string;
  department: string;
  year: string;
  section: string;
  position_id: number;
  position_name: string;
  status: string;
  is_active: boolean;
}

export default function PositionsPage() {
  const [positions, setPositions] = useState<AdminPositionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [editingPosition, setEditingPosition] = useState<AdminPositionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", displayOrder: 0 });

  const [candidates, setCandidates] = useState<PositionCandidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [filterClass, setFilterClass] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterCROnly, setFilterCROnly] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getPositions();
      setPositions(Array.isArray(data) ? data : (data as { data: AdminPositionRecord[] }).data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load positions");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCandidates = useCallback(async (positionId?: number) => {
    try {
      setCandidatesLoading(true);
      // Use the correct API endpoint: GET /api/admin/candidates/approved
      const params = new URLSearchParams();
      if (positionId) params.append("position_id", String(positionId));

      const queryString = params.toString();
      const endpoint = `/admin/candidates/approved${queryString ? '?' + queryString : ''}`;
      const response = await api.get<{ data: PositionCandidate[]; meta?: { count: number } }>(endpoint);

      // Handle both wrapped and unwrapped response
      const data = Array.isArray(response) ? response : (response.data || []);
      setCandidates(data);
    } catch (e) {
      console.error("Failed to load candidates:", e);
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load candidates when a position is selected
  useEffect(() => {
    if (selectedPosition) {
      loadCandidates(selectedPosition);
    } else {
      loadCandidates(); // Load all candidates
    }
  }, [selectedPosition, loadCandidates]);

  const handleOpenEdit = (position: AdminPositionRecord) => {
    setEditingPosition(position);
    setFormData({
      name: position.name || "",
      description: position.description || "",
      displayOrder: position.display_order || 0,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingPosition) return;
    setSaving(true);
    try {
      await adminApi.updatePosition(editingPosition.id, {
        name: formData.name,
        description: formData.description,
        display_order: formData.displayOrder,
      });
      setToast({ type: "success", message: "Position updated successfully" });
      setIsModalOpen(false);
      setEditingPosition(null);
      await load();
    } catch (e) {
      setToast({ type: "error", message: e instanceof Error ? e.message : "Failed to update position" });
    } finally {
      setSaving(false);
    }
  };

  const movePosition = async (index: number, direction: -1 | 1) => {
    const target = positions[index + direction];
    const current = positions[index];
    if (!target) return;
    setSaving(true);
    try {
      // Swap display orders in the database, then reload the real order
      await adminApi.updatePosition(current.id, { display_order: target.display_order });
      await adminApi.updatePosition(target.id, { display_order: current.display_order });
      await load();
      showToast("success", "Position order updated.");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Reorder failed.");
    }
    setSaving(false);
  };

  // Filter candidates based on selected filters
  const filteredCandidates = candidates.filter((c) => {
    if (filterClass !== "all" && c.department !== filterClass) return false;
    if (filterSection !== "all" && c.section !== filterSection) return false;
    // CR filter checks position_name for "Class Representative" or "Class Rep"
    if (filterCROnly && !c.position_name?.toLowerCase().includes('class rep')) return false;
    return true;
  });

  // Get unique classes and sections from candidates
  const uniqueClasses = [...new Set(candidates.map((c) => c.department).filter(Boolean))];
  const uniqueSections = [...new Set(candidates.map((c) => c.section).filter(Boolean))];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Positions</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage election positions and view candidates
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

        {/* Candidate Filters Section */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Candidates</h2>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[160px]">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                  Position
                </label>
                <select
                  value={selectedPosition || "all"}
                  onChange={(e) => setSelectedPosition(e.target.value === "all" ? null : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Positions</option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

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
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={filterCROnly}
                    onChange={(e) => setFilterCROnly(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Class Rep Only
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>
                {candidatesLoading ? "Loading..." : `${filteredCandidates.length} candidates found`}
              </span>
            </div>
          </div>
        </Card>

        {/* Candidates List */}
        {candidatesLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredCandidates.length > 0 ? (
          <Card>
            <div className="divide-y divide-gray-100">
              {filteredCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                      {candidate.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{candidate.full_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span>{candidate.department}</span>
                        <span>•</span>
                        <span>{candidate.year}</span>
                        <span>•</span>
                        <span>Section {candidate.section}</span>
                        <span>•</span>
                        <Badge variant="info">{candidate.position_name}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card>
            <div className="p-8 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No candidates found matching your filters.</p>
            </div>
          </Card>
        )}

        {/* Positions List */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Positions</h2>
          {positions.length === 0 ? (
            <Card>
              <div className="p-8 text-center text-gray-500">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No positions found. Create an election first.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {positions.map((position) => (
                <Card key={position.id}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{position.name}</h3>
                        {position.description && (
                          <p className="text-sm text-gray-500 mt-1">{position.description}</p>
                        )}
                        {position.constituency_id && (
                          <Badge variant="info" className="mt-2">
                            Class Rep
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => movePosition(positions.indexOf(position), -1)}
                          disabled={positions.indexOf(position) === 0 || saving}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => movePosition(positions.indexOf(position), 1)}
                          disabled={positions.indexOf(position) === positions.length - 1 || saving}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-500">
                        Order: {position.display_order}
                      </span>
                      <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleOpenEdit(position)}>
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {isModalOpen && editingPosition && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit Position">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-sm text-amber-600 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Positions can be modified while the election is in DRAFT or SCHEDULED status.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSave} disabled={saving || !formData.name.trim()}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`fixed bottom-4 right-4 px-4 py-3 rounded-xl shadow-lg text-white ${
              toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
