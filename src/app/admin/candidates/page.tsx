"use client"

import { AdminLayout } from "@/components/admin-dashboard/AdminLayout"
import { Card } from "@/components/ui/Card"
import { listCandidates } from "@/lib/candidates-api"
import { adminApi } from "@/lib/api/admin"
import type { Candidate } from "@/lib/candidate-data"
import { useEffect, useMemo, useRef, useState } from "react"
import { Users, AlertCircle, ChevronDown, Search, Pencil, X, ImagePlus, CheckCircle2, Loader2 } from "lucide-react"

interface EditDraft {
  id: string
  name: string
  department: string
  year: string
  section: string
  gender: string
  description: string
  image_url: string
}

export default function CandidateViewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState("")
  const [search, setSearch] = useState("")
  const [dept, setDept] = useState("")
  const [year, setYear] = useState("")
  const [section, setSection] = useState("")
  const [editing, setEditing] = useState<EditDraft | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => {
    setLoading(true)
    listCandidates({ scope: "all", limit: 5000 })
      .then(setCandidates)
      .catch((e) => setError(e?.message || "Failed to load candidates"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const departments = useMemo(() => {
    return Array.from(new Set(candidates.map((c) => c.department).filter(Boolean))).sort()
  }, [candidates])

  const years = useMemo(() => {
    const rows = dept ? candidates.filter((c) => c.department === dept) : candidates
    return Array.from(new Set(rows.map((c) => c.year).filter(Boolean))).sort()
  }, [candidates, dept])

  const sections = useMemo(() => {
    const rows = candidates.filter(
      (c) => (!dept || c.department === dept) && (!year || c.year === year)
    )
    const all = Array.from(new Set(rows.map((c) => c.section || "")))
    all.sort()
    return all
  }, [candidates, dept, year])

  const filtered = useMemo(() => {
    return candidates.filter((c) => {
      if (dept && c.department !== dept) return false
      if (year && c.year !== year) return false
      if (section && (c.section || "") !== section) return false
      if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false
      return true
    })
  }, [candidates, dept, year, section, search])

  const selectStyle = (selected: boolean) =>
    `appearance-none bg-white dark:bg-[#252540] border border-border rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      selected ? "bg-primary-50 border-primary-400 font-medium" : ""
    }`

  const openEdit = (c: Candidate) => {
    setEditing({
      id: c.id,
      name: c.name,
      department: c.department || "",
      year: c.year || "",
      section: c.section || "",
      gender: c.gender || "Other",
      description: c.biography || "",
      image_url: c.profilePhotoUrl || "",
    })
    setNotice("")
  }

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editing) return
    if (file.size > 5 * 1024 * 1024) {
      setNotice("Photo must be 5MB or smaller.")
      return
    }
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result || "")
      try {
        setSaving(true)
        const res = await adminApi.uploadCandidatePhoto(dataUrl)
        setEditing((prev) => (prev ? { ...prev, image_url: res.url } : prev))
        setNotice("Photo uploaded. Save to keep changes.")
        if (fileRef.current) fileRef.current.value = ""
      } catch (err: unknown) {
        setNotice("Photo upload failed: " + ((err as Error)?.message || "unknown error"))
      } finally {
        setSaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    setNotice("")
    try {
      await adminApi.updateCandidate(editing.id, {
        name: editing.name,
        description: editing.description || editing.name,
        image_url: editing.image_url || undefined,
        department: editing.department || undefined,
        year: editing.year || undefined,
        section: editing.section || null,
        gender: editing.gender || undefined,
      })
      setNotice("Candidate saved.")
      setEditing(null)
      load()
    } catch (err: unknown) {
      setNotice("Save failed: " + ((err as Error)?.message || "unknown error"))
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-[#252540]"

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Candidates</h1>
          <p className="text-text-secondary mt-1">
            Static master candidate list ({candidates.length} people). Click Edit to change details or upload a photo.
          </p>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search candidate name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="relative">
              <select value={dept} onChange={(e) => { setDept(e.target.value); setYear(""); setSection("") }} className={selectStyle(Boolean(dept))}>
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            </div>

            <div className="relative">
              <select value={year} onChange={(e) => { setYear(e.target.value); setSection("") }} className={selectStyle(Boolean(year))}>
                <option value="">All Semesters</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            </div>

            <div className="relative">
              <select value={section} onChange={(e) => setSection(e.target.value)} className={selectStyle(Boolean(section))}>
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s || "No Section"}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3">
            {filtered.length} of {candidates.length} candidate(s) shown
            {dept && <> · Department: <strong>{dept}</strong></>}
            {year && <> · Semester: <strong>{year}</strong></>}
            {section && <> · Section: <strong>{section || "—"}</strong></>}
          </p>
        </Card>

        {notice && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2">
            <CheckCircle2 className="h-4 w-4" /> {notice}
          </div>
        )}

        {loading ? (
          <Card className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </Card>
        ) : error ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-text-secondary text-sm">{error}</p>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary">No candidates found</h3>
            <p className="text-text-secondary mt-1">Adjust the filters or clear the search.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((c) => (
              <Card key={c.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {c.profilePhotoUrl ? (
                    <img
                      src={c.profilePhotoUrl}
                      alt={c.name}
                      className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {c.photoInitials || c.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
                    <p className="text-xs text-text-secondary truncate">
                      {c.department} {c.year || ""} {c.section || ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.gender === "Female" ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" : c.gender === "Male" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {c.gender || "Other"}
                  </span>
                  <button
                    onClick={() => openEdit(c)}
                    className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !saving && setEditing(null)}>
          <Card className="w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Edit Candidate</h3>
              <button onClick={() => setEditing(null)} disabled={saving} className="text-text-muted hover:text-text-primary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative">
                {editing.image_url ? (
                  <img src={editing.image_url} alt="candidate" className="w-20 h-20 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold shrink-0">
                    {editing.name.slice(0, 2).toUpperCase() || "?"}
                  </div>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={saving}
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-50"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={onPickPhoto} />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">Full Name</label>
                <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} disabled={saving} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Department</label>
                <input className={inputCls} value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} disabled={saving} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Semester</label>
                <input className={inputCls} value={editing.year} onChange={(e) => setEditing({ ...editing, year: e.target.value })} disabled={saving} />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Section</label>
                <input className={inputCls} value={editing.section} onChange={(e) => setEditing({ ...editing, section: e.target.value })} disabled={saving} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Gender</label>
              <select className={inputCls} value={editing.gender} onChange={(e) => setEditing({ ...editing, gender: e.target.value })} disabled={saving}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Manifesto / Bio</label>
              <textarea
                className={`${inputCls} min-h-[120px] resize-y`}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} disabled={saving} className="px-4 py-2 text-sm rounded-lg border border-border text-text-secondary hover:bg-bg-tertiary/40">
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editing.name.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
              </button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}