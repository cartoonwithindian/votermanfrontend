"use client"

import { AdminLayout } from "@/components/admin-dashboard/AdminLayout"
import { Card } from "@/components/ui/Card"
import { listCandidates } from "@/lib/candidates-api"
import type { Candidate } from "@/lib/candidate-data"
import { useEffect, useMemo, useState } from "react"
import { Users, User, AlertCircle, ChevronDown, Search } from "lucide-react"

export default function CandidateViewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [dept, setDept] = useState("")
  const [year, setYear] = useState("")
  const [section, setSection] = useState("")

  useEffect(() => {
    listCandidates({ limit: 1000 })
      .then(setCandidates)
      .catch((e) => setError(e?.message || "Failed to load candidates"))
      .finally(() => setLoading(false))
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

  const boys = useMemo(() => filtered.filter((c) => c.gender === "Male"), [filtered])
  const girls = useMemo(() => filtered.filter((c) => c.gender === "Female"), [filtered])

  const hasSelection = Boolean(dept || year || section || search.trim())
  const total = filtered.length

  const selectStyle = (selected: boolean) =>
    `appearance-none bg-white dark:bg-[#252540] border border-border rounded-lg px-4 py-2 pr-8 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      selected ? "bg-primary-50 border-primary-400 font-medium" : ""
    }`

  const renderCandidate = (c: Candidate) => (
    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-tertiary/40">
      {c.profilePhotoUrl ? (
        <img
          src={c.profilePhotoUrl}
          alt={c.name}
          className="w-10 h-10 rounded-full object-cover border border-border shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
          {c.photoInitials || c.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{c.name}</p>
        <p className="text-xs text-text-secondary truncate">{c.position}</p>
      </div>
    </div>
  )

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Candidates by Class</h1>
          <p className="text-text-secondary mt-1">
            Select department, year and section to see the Boys and Girls candidates.
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
                <option value="">All Years</option>
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
            {total} candidate(s)
            {dept && <> · Department: <strong>{dept}</strong></>}
            {year && <> · Year: <strong>{year}</strong></>}
            {section && <> · Section: <strong>{section || "—"}</strong></>}
          </p>
        </Card>

        {loading ? (
          <Card className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </Card>
        ) : error ? (
          <Card className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-error mx-auto mb-4" />
            <p className="text-text-secondary text-sm">{error}</p>
          </Card>
        ) : !hasSelection ? (
          <Card className="p-12 text-center">
            <Users className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary">Pick a class to view</h3>
            <p className="text-text-secondary mt-1">Choose department, year and section to see candidates split into Boys and Girls.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-600" /> Boys ({boys.length})
                </h2>
              </div>
              {boys.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No boys candidates.</p>
              ) : (
                <div className="space-y-2">{boys.map(renderCandidate)}</div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary flex items-center gap-2">
                  <User className="w-4 h-4 text-pink-600" /> Girls ({girls.length})
                </h2>
              </div>
              {girls.length === 0 ? (
                <p className="text-sm text-text-secondary text-center py-8">No girls candidates.</p>
              ) : (
                <div className="space-y-2">{girls.map(renderCandidate)}</div>
              )}
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}