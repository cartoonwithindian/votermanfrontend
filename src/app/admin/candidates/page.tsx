"use client"

import { AdminLayout } from "@/components/admin-dashboard/AdminLayout"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { CANDIDATE_STATUS_MAP } from "@/lib/admin-dashboard-data"
import {
  updateApplicationStatus,
  getAllApplications,
  type CandidateApplicationData,
} from "@/lib/candidate-application-store"
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  X,
  Upload,
  FileJson,
  ListChecks,
  Trash2,
} from "lucide-react"
import { useState, useMemo, useEffect, useRef } from "react"
import { COURSES } from "@/lib/class-data"

export default function CandidateManagementPage() {
  const [candidates, setCandidates] = useState<CandidateApplicationData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [positionFilter, setPositionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [showPanel, setShowPanel] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showChangesModal, setShowChangesModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [changesText, setChangesText] = useState("")
  const [rejectReason, setRejectReason] = useState("")
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const [approveError, setApproveError] = useState("")

  // JSON override state
  const [jsonInfo, setJsonInfo] = useState<{ hasJson: boolean; count: number; candidates?: any[] } | null>(null)
  const [jsonUploading, setJsonUploading] = useState(false)
  const [jsonError, setJsonError] = useState("")
  const [ballotAdding, setBallotAdding] = useState(false)
  const [ballotAdded, setBallotAdded] = useState<{ name: string; candidateId: string; department: string; year: string; section: string; positionName: string }[]>([])
  const [removingId, setRemovingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "/api/v1").replace(/\/$/, "")

  const fetchJsonInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/candidates/json`, { credentials: "include" })
      if (res.ok) {
        const j = await res.json()
        setJsonInfo({ hasJson: j.hasJson, count: j.count || 0, candidates: j.candidates || [] })
      }
    } catch {}
  }

  const fetchCsrf = async () => {
    try {
      const r = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include" })
      const j = await r.json().catch(() => ({}))
      const token = j.data?.csrfToken || ""
      if (token && typeof document !== "undefined") {
        document.cookie = `cv_csrf=${encodeURIComponent(token)}; path=/; SameSite=Lax; max-age=3600`
      }
      return token
    } catch { return "" }
  }

  const getBindingToken = () => {
    if (typeof window === "undefined") return ""
    return window.sessionStorage.getItem("campusvote_binding_token") || ""
  }

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setJsonError("")
    setJsonUploading(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.candidates) ? parsed.candidates : null
      if (!arr) throw new Error("JSON must be array or {candidates:[...]}")
      const csrf = await fetchCsrf()
      const res = await fetch(`${API_BASE}/admin/candidates/json`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, "X-Session-Binding": getBindingToken() },
        body: JSON.stringify({ candidates: arr }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || "Upload failed")
      showToast(`JSON uploaded: ${body.count} candidates — students now see JSON (cohort-filtered)`, "success")
      fetchJsonInfo()
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON")
    } finally {
      setJsonUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleJsonDelete = async () => {
    try {
      const csrf = await fetchCsrf()
      const res = await fetch(`${API_BASE}/admin/candidates/json`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrf, "X-Session-Binding": getBindingToken() },
      })
      if (!res.ok) throw new Error("Delete failed")
      showToast("JSON removed — students now see DB approved candidates", "success")
      fetchJsonInfo()
    } catch (e: any) {
      showToast(e.message || "Delete failed", "error")
    }
  }

  const handleAddToBallot = async () => {
    if (!jsonInfo?.hasJson) {
      showToast("Upload a JSON file first", "error")
      return
    }
    setBallotAdding(true)
    try {
      const csrf = await fetchCsrf()
      const res = await fetch(`${API_BASE}/admin/candidates/json/add-to-ballot`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, "X-Session-Binding": getBindingToken() },
        body: JSON.stringify({}),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || "Add to ballot failed")
      setBallotAdded(body.added ?? [])
      showToast(body.message ?? "Candidates added to ballot", "success")
    } catch (err: any) {
      showToast(err.message || "Add to ballot failed", "error")
    } finally {
      setBallotAdding(false)
    }
  }

  const handleRemoveBallotCandidate = async (id: string) => {
    setRemovingId(id)
    try {
      const csrf = await fetchCsrf()
      const res = await fetch(`${API_BASE}/admin/candidates/ballot/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrf, "X-Session-Binding": getBindingToken() },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || "Remove failed")
      setBallotAdded((prev) => prev.filter((c) => c.candidateId !== id))
      showToast("Candidate removed from ballot", "success")
    } catch (err: any) {
      showToast(err.message || "Remove failed", "error")
    } finally {
      setRemovingId(null)
    }
  }

  // Courses offered on the candidate application form + any course seen in real data
  const formDepartments = COURSES
  const statuses = ["all", "draft", "submitted", "under_review", "changes_requested", "approved", "rejected"]
  const positions = useMemo(() => {
    const seen = Array.from(new Set(candidates.map((c) => c.position).filter(Boolean))) as string[]
    return ["all", ...seen]
  }, [candidates])
  const departments = useMemo(() => {
    const seen = Array.from(new Set(candidates.map((c) => c.department).filter(Boolean))) as string[]
    return ["all", ...Array.from(new Set([...formDepartments, ...seen]))]
  }, [candidates, formDepartments])

  useEffect(() => {
    getAllApplications()
      .then(setCandidates)
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false))
    fetchJsonInfo()
  }, [])

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPosition = positionFilter === "all" || c.position === positionFilter
      const matchesStatus = statusFilter === "all" || c.status === statusFilter
      const matchesDepartment = departmentFilter === "all" || c.department === departmentFilter
      return matchesSearch && matchesPosition && matchesStatus && matchesDepartment
    })
  }, [candidates, searchQuery, positionFilter, statusFilter, departmentFilter])

  const getStatusBadge = (status: string): "default" | "success" | "warning" | "error" | "info" | "neutral" => {
    const map = CANDIDATE_STATUS_MAP[status] || { label: status, variant: "default" }
    return map.variant as "default" | "success" | "warning" | "error" | "info" | "neutral"
  }

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openReview = (candidate: any) => {
    setSelectedCandidate(candidate)
    setShowPanel(true)
  }

  const closeReview = () => {
    setShowPanel(false)
    setSelectedCandidate(null)
    setShowApproveModal(false)
    setShowChangesModal(false)
    setShowRejectModal(false)
    setChangesText("")
    setRejectReason("")
    setApproveError("")
  }

  const handleApprove = async () => {
    if (!selectedCandidate) return;
    try {
      await updateApplicationStatus(selectedCandidate.id, "approved");
      showToast(`${selectedCandidate.name} has been approved.`);
      closeReview();
      getAllApplications().then(setCandidates).catch(() => {});
    } catch (err: any) {
      setApproveError(err?.message || "Approval failed. Please try again.");
    }
  };

  const handleRequestChanges = async () => {
    if (!selectedCandidate || !changesText.trim()) return;
    await updateApplicationStatus(selectedCandidate.id, "changes_requested", changesText.trim());
    showToast(`Changes requested for ${selectedCandidate.name}.`);
    closeReview();
    getAllApplications().then(setCandidates).catch(() => {});
  };

  const handleReject = async () => {
    if (!selectedCandidate || !rejectReason.trim()) return;
    await updateApplicationStatus(selectedCandidate.id, "rejected", rejectReason.trim());
    showToast(`${selectedCandidate.name} has been rejected.`, "error");
    closeReview();
    getAllApplications().then(setCandidates).catch(() => {});
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {toast && (
          <div className={`fixed top-4 right-4 z-[70] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.type === "success" ? "bg-success" : "bg-error"}`}>
            {toast.message}
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-text-primary">Candidate Management</h1>
          <p className="text-text-secondary mt-1">Review and manage candidate applications.</p>
        </div>

        {/* JSON override — Card/Profile fields, cohort-isolated */}
        <Card className="p-5 border-primary-200 bg-primary-50/50">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center"><FileJson className="w-5 h-5 text-white" /></div>
              <div>
                <h2 className="font-semibold text-text-primary flex items-center gap-2">JSON Candidate Override {jsonInfo?.hasJson && <Badge variant="success">{jsonInfo.count} active</Badge>}</h2>
                <p className="text-xs text-text-secondary mt-0.5">Upload JSON with <strong>8 fields only</strong>: <code>profilePhotoUrl</code> (link), <code>Full Name</code>, <code>Position</code>, <code>Department</code>, <code>Year</code>, <code>Section</code>, <code>Email</code>, <code>Manifesto</code>. Students see <strong>only same department/year/section</strong>.</p>
                <p className="text-xs text-text-muted mt-1">Format: <code>[{"{fullName, position, department, year, section, email, profilePhotoUrl, manifesto}"}]</code></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleJsonUpload} className="hidden" />
              <Button variant="primary" size="sm" className="gap-1.5" isLoading={jsonUploading} onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" />Upload JSON</Button>
              {jsonInfo?.hasJson && <Button variant="outline" size="sm" className="gap-1.5 text-error-600" onClick={handleJsonDelete}><Trash2 className="w-4 h-4" />Remove JSON</Button>}
              {jsonInfo?.hasJson && <Button variant="primary" size="sm" className="gap-1.5" isLoading={ballotAdding} onClick={handleAddToBallot}><ListChecks className="w-4 h-4" />Add to Ballot</Button>}
            </div>
          </div>
          {jsonInfo?.hasJson && <p className="text-xs text-success-700 mt-3">✓ JSON active — <code>candidateService.js:25 findApproved()</code> now serves JSON (filtered by <code>candidateController.js:38 hasOwnClass</code>). Delete the JSON to revert to the previous ballot rows.</p>}
          {jsonError && <p className="text-xs text-error-600 mt-2">{jsonError}</p>}
          {jsonInfo && !jsonInfo.hasJson && <p className="text-xs text-text-muted mt-2">No JSON override — students see DB approved candidates.</p>}
          {jsonInfo?.hasJson && jsonInfo.candidates && jsonInfo.candidates.length > 0 && (
            <div className="mt-4 border-t border-primary-200 pt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">JSON Candidates (8-field, cohort-filtered)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border"><th className="text-left px-2 py-1">ID</th><th className="text-left px-2 py-1">Full Name</th><th className="text-left px-2 py-1">Position</th><th className="text-left px-2 py-1">Dept</th><th className="text-left px-2 py-1">Year</th><th className="text-left px-2 py-1">Sec</th><th className="text-left px-2 py-1">Email</th><th className="text-left px-2 py-1">Photo</th></tr></thead>
                  <tbody>{jsonInfo.candidates.map((c:any)=>(
                    <tr key={c.id} className="border-b border-border/50"><td className="px-2 py-1 font-mono">{c.id}</td><td className="px-2 py-1">{c.fullName||c.FullName||c.name}</td><td className="px-2 py-1">{c.position||c.position_name||c.Position}</td><td className="px-2 py-1">{c.department}</td><td className="px-2 py-1">{c.year}</td><td className="px-2 py-1">{c.section||"—"}</td><td className="px-2 py-1 truncate max-w-[120px]">{c.email||c.Email}</td><td className="px-2 py-1 truncate max-w-[100px]">{c.profilePhotoUrl ? "✓" : "—"}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <p className="text-xs text-text-muted mt-1">Manifesto hidden in table — shown on Profile <code>[candidateId]/page.tsx:151</code>. Cohort: <code>BCA•A:4</code> <code>BCA•B:1</code> <code>BBA:1</code></p>
            </div>
          )}
          {ballotAdded.length > 0 && (
            <div className="mt-4 border-t border-primary-200 pt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Added to Ballot ({ballotAdded.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border"><th className="text-left px-2 py-1">Name</th><th className="text-left px-2 py-1">Dept/Year/Section</th><th className="text-left px-2 py-1">Position</th><th className="text-left px-2 py-1">Actions</th></tr></thead>
                  <tbody>{ballotAdded.filter((row) => row.candidateId).map((row) => (
                    <tr key={row.candidateId} className="border-b border-border/50"><td className="px-2 py-1">{row.name}</td><td className="px-2 py-1">{row.department} • {row.year} • {row.section || "—"}</td><td className="px-2 py-1">{row.positionName}</td><td className="px-2 py-1"><Button variant="outline" size="sm" className="gap-1 text-error-600" isLoading={removingId === row.candidateId} disabled={removingId !== null && removingId !== row.candidateId} onClick={() => handleRemoveBallotCandidate(row.candidateId)}><Trash2 className="w-3 h-3" />Remove</Button></td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search candidate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="relative">
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-[#252540] border border-border rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos === "all" ? "All Positions" : pos}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-[#252540] border border-border rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Statuses" : CANDIDATE_STATUS_MAP[s]?.label || s}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-[#252540] border border-border rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d === "all" ? "All Courses" : d}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            </div>
          </div>
        </Card>

        <Card>
          {filteredCandidates.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-text-primary">No Candidate Applications</h3>
              <p className="text-text-secondary mt-1">No candidates match the current filters.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Position</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Department</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Application Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Submitted</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((candidate) => (
                      <tr key={candidate.id} className="border-b border-border hover:bg-bg-tertiary transition-colors">
                        <td className="px-4 py-3 text-sm text-text-secondary font-mono">{candidate.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-text-primary">{candidate.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">{candidate.position}</td>
                        <td className="px-4 py-3">
                          <Badge variant={candidate.category === "CR" ? "info" : "neutral"}>
                            {candidate.category === "CR" ? "CR" : "Club"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-primary">{candidate.department}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadge(candidate.status)}>
                            {CANDIDATE_STATUS_MAP[candidate.status]?.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {candidate.submittedDate || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openReview(candidate)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-border">
                {filteredCandidates.map((candidate) => (
                  <div key={candidate.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-text-primary">{candidate.name}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReview(candidate)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </div>
                    <div className="text-sm text-text-secondary font-mono">{candidate.id}</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-text-secondary">{candidate.position}</span>
                      <span className="text-text-muted">·</span>
                      <span className="text-sm text-text-secondary">{candidate.department}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={getStatusBadge(candidate.status)}>
                        {CANDIDATE_STATUS_MAP[candidate.status]?.label}
                      </Badge>
                    </div>
                    {candidate.submittedDate && candidate.submittedDate !== "—" && (
                      <div className="text-xs text-text-muted">Submitted: {candidate.submittedDate}</div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {showPanel && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={closeReview}
            />

            <div className="relative ml-auto w-full max-w-lg bg-white dark:bg-[#252540] shadow-2xl overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-[#252540] border-b border-border px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={closeReview} className="p-1 hover:bg-bg-tertiary rounded-lg transition-colors">
                    <ArrowLeft className="h-5 w-5 text-text-secondary" />
                  </button>
                  <h2 className="text-lg font-semibold text-text-primary">Candidate Review</h2>
                </div>
                <button onClick={closeReview} className="p-1 hover:bg-bg-tertiary rounded-lg transition-colors">
                  <X className="h-5 w-5 text-text-muted" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {selectedCandidate.photo ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Profile Photo</h3>
                    <img
                      src={selectedCandidate.photo}
                      alt={selectedCandidate.name}
                      className="w-32 h-32 rounded-2xl object-cover border border-border"
                    />
                  </div>
                ) : null}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Verified Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted">Full Name</label>
                      <p className="text-sm font-medium text-text-primary">{selectedCandidate.name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Candidate ID</label>
                      <p className="text-sm font-medium text-text-primary font-mono">{selectedCandidate.id}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Enrollment Number</label>
                      <p className="text-sm font-medium text-text-primary font-mono">{selectedCandidate.enrollmentNumber || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Position</label>
                      <p className="text-sm font-medium text-text-primary">{selectedCandidate.position}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Department</label>
                      <p className="text-sm font-medium text-text-primary">{selectedCandidate.department}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Year</label>
                      <p className="text-sm font-medium text-text-primary">{selectedCandidate.year || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Section</label>
                      <p className="text-sm font-medium text-text-primary">{selectedCandidate.section || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Current Status</label>
                      <Badge variant={getStatusBadge(selectedCandidate.status)}>
                        {CANDIDATE_STATUS_MAP[selectedCandidate.status]?.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Contact Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted">Email</label>
                      <p className="text-sm font-medium text-text-primary">{selectedCandidate.email || "—"}</p>
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Phone</label>
                      <p className="text-sm font-medium text-text-primary">{selectedCandidate.phone || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Biography</h3>
                  <p className="text-sm text-text-primary leading-relaxed bg-bg-tertiary rounded-lg p-4">
                    {selectedCandidate.biography || "No biography provided."}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Campaign</h3>
                  <div className="bg-bg-tertiary rounded-lg p-4 space-y-2">
                    <p className="text-sm font-medium text-text-primary">
                      {selectedCandidate.campaignTitle || "No campaign title"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {selectedCandidate.campaignDescription || "No campaign description provided."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Manifesto</h3>
                  <div className="bg-bg-tertiary rounded-lg p-4 space-y-3">
                    {(() => {
                      try {
                        const sections = JSON.parse(selectedCandidate.manifesto || "[]");
                        if (Array.isArray(sections) && sections.length > 0) {
                          return sections.map((s: any, i: number) => (
                            <div key={i}>
                              <p className="text-sm font-semibold text-text-primary">{s.title || `Section ${i + 1}`}</p>
                              <p className="text-sm text-text-secondary mt-0.5">{s.content || "No content"}</p>
                            </div>
                          ));
                        }
                        return <p className="text-sm text-text-primary">{selectedCandidate.manifesto || "No manifesto provided."}</p>;
                      } catch {
                        return <p className="text-sm text-text-primary">{selectedCandidate.manifesto || "No manifesto provided."}</p>;
                      }
                    })()}
                  </div>
                </div>

                {selectedCandidate.rejectionReason && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-error-600 uppercase tracking-wide">Rejection Reason</h3>
                    <div className="bg-error-50 border border-error-100 rounded-lg p-4">
                      <p className="text-sm text-error-700">{selectedCandidate.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {selectedCandidate.adminNote && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-warning-600 uppercase tracking-wide">Admin Note</h3>
                    <div className="bg-warning-50 border border-warning-100 rounded-lg p-4">
                      <p className="text-sm text-warning-700">{selectedCandidate.adminNote}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Submission</h3>
                  <p className="text-sm text-text-primary">
                    Submitted: {selectedCandidate.submittedDate || "Not yet submitted"}
                  </p>
                </div>

                <div className="border-t border-border pt-6 space-y-3">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => setShowApproveModal(true)}
                      className="bg-success-600 hover:bg-success-600 text-white"
                      disabled={selectedCandidate.status === "approved"}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => setShowChangesModal(true)}
                      variant="outline"
                      disabled={selectedCandidate.status === "approved" || selectedCandidate.status === "rejected"}
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Request Changes
                    </Button>
                    <Button
                      onClick={() => setShowRejectModal(true)}
                      variant="danger"
                      disabled={selectedCandidate.status === "approved" || selectedCandidate.status === "rejected"}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                  <Button onClick={closeReview} variant="outline" className="w-full">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showApproveModal && selectedCandidate && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowApproveModal(false)} />
            <div className="relative bg-white dark:bg-[#252540] rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-success-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Approve Candidate?</h3>
                  <p className="text-sm text-text-secondary">
                    This candidate will gain access to the candidate dashboard.
                  </p>
                </div>
              </div>

              {approveError && <p className="text-sm text-error-600">{approveError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowApproveModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-success-600 hover:bg-success-600 text-white"
                  onClick={handleApprove}
                >
                  Approve
                </Button>
              </div>
            </div>
          </div>
        )}

        {showChangesModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowChangesModal(false)} />
            <div className="relative bg-white dark:bg-[#252540] rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">Request Changes</h3>
                <button onClick={() => setShowChangesModal(false)} className="p-1 hover:bg-bg-tertiary rounded">
                  <X className="h-5 w-5 text-text-muted" />
                </button>
              </div>
              <p className="text-sm text-text-secondary">What needs to be updated?</p>
              <textarea
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
                placeholder="Describe what changes are needed..."
                rows={4}
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowChangesModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestChanges}
                  disabled={!changesText.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowRejectModal(false)} />
            <div className="relative bg-white dark:bg-[#252540] rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary">Reject Application</h3>
                <button onClick={() => setShowRejectModal(false)} className="p-1 hover:bg-bg-tertiary rounded">
                  <X className="h-5 w-5 text-text-muted" />
                </button>
              </div>
              <p className="text-sm text-text-secondary">Reason for rejection <span className="text-error-500">*</span></p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={4}
                className="w-full border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-error-500 resize-none"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  disabled={!rejectReason.trim()}
                  onClick={handleReject}
                >
                  Reject Application
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
