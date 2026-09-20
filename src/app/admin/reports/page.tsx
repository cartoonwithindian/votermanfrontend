"use client"

import { useEffect, useState } from "react"
import { AdminLayout } from "@/components/admin-dashboard/AdminLayout"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { adminApi, type AdminStats, type AuditLogRecord, type AdminStudentRecord } from "@/lib/api/admin"
import {
  FileText,
  Download,
  Printer,
  BarChart3,
  Users,
  Vote,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Inbox,
  TrendingUp,
} from "lucide-react"

const reportTypes = [
  { id: "participation", label: "Participation Report", description: "Voter turnout and ballot statistics from the live database.", icon: Users },
  { id: "candidates", label: "Candidate Report", description: "All candidate applications and their review status.", icon: Vote },
  { id: "students", label: "Student Report", description: "Registered accounts, roles and voting eligibility.", icon: FileText },
  { id: "activity", label: "Activity Report", description: "Audit-logged administrative actions per day.", icon: TrendingUp },
]

interface AppRow {
  id: string
  fullName: string
  department: string
  position: string
  status: string
}

interface DayBucket {
  date: string
  total: number
  logins: number
  votes: number
  approvals: number
}

function bucketAuditLogs(logs: AuditLogRecord[]): DayBucket[] {
  const byDay: Record<string, DayBucket> = {}
  for (const log of logs.slice(0, 2000)) {
    const d = new Date(log.created_at)
    if (isNaN(d.getTime())) continue
    const key = d.toISOString().slice(0, 10)
    if (!byDay[key]) byDay[key] = { date: key, total: 0, logins: 0, votes: 0, approvals: 0 }
    byDay[key].total++
    const action = (log.action || "").toLowerCase()
    if (action.includes("login") || action.includes("session")) byDay[key].logins++
    if (action.includes("vote") || action.includes("ballot")) byDay[key].votes++
    if (action.includes("approv") || action.includes("eligib") || action.includes("role")) byDay[key].approvals++
  }
  return Object.values(byDay)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 14)
}

export default function AdminReportsPage() {
  const [activeReport, setActiveReport] = useState<string | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [applications, setApplications] = useState<AppRow[]>([])
  const [students, setStudents] = useState<AdminStudentRecord[]>([])
  const [activity, setActivity] = useState<DayBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const [statsRes, appsRes, studentsRes, logsRes] = await Promise.all([
        adminApi.getStats(),
        adminApi
          .getMonitorElections()
          .then(() => null)
          .catch(() => null),
        adminApi.getStudents(),
        adminApi.getAuditLogs(),
      ])
      setStats(statsRes)

      const studentRows: AdminStudentRecord[] = Array.isArray(studentsRes)
        ? studentsRes
        : ((studentsRes as { students?: AdminStudentRecord[] }).students as AdminStudentRecord[]) || []
      setStudents(studentRows)

      const logs = logsRes?.logs || []
      setActivity(bucketAuditLogs(logs))

      // Candidate applications from the real review endpoint
      try {
        const res = await fetch(
          `${(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1").replace(/\/$/, "")}/admin/candidate-applications`,
          { credentials: "include" }
        )
        if (res.ok) {
          const json = await res.json()
          const apps: any[] = json?.candidates || json?.data || []
          setApplications(
            apps.map((a) => ({
              id: String(a.id),
              fullName: a.fullName || "—",
              department: a.department || "—",
              position: a.contestingPosition || a.position || "—",
              status: a.status || "under_review",
            }))
          )
        }
      } catch {
        // applications section shows empty state on failure
      }
      void appsRes
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load reports. Please try again.")
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const participationRate =
    stats && stats.students.voting_eligible > 0
      ? Math.round((stats.votes.unique_voters / stats.students.voting_eligible) * 1000) / 10
      : 0

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
        return "success"
      case "rejected":
        return "error"
      case "changes_requested":
        return "warning"
      case "under_review":
        return "info"
      default:
        return "neutral"
    }
  }

  const handleExportCSV = (reportId: string) => {
    let csvContent = ""
    if (reportId === "participation" && stats) {
      csvContent =
        "Metric,Value\n" +
        `Eligible Students,${stats.students.voting_eligible}\n` +
        `Total Ballots,${stats.votes.total}\n` +
        `Unique Voters,${stats.votes.unique_voters}\n` +
        `Participation %,${participationRate}%\n` +
        `Total Students,${stats.students.total}\n` +
        `Active Students,${stats.students.active}\n`
    } else if (reportId === "candidates") {
      csvContent =
        "ID,Name,Department,Position,Status\n" +
        applications.map((c) => `${c.id},${c.fullName},${c.department},${c.position},${c.status}`).join("\n")
    } else if (reportId === "students") {
      csvContent =
        "ID,Name,Email,Role,Active,Voting Eligible\n" +
        students
          .map((s) => `${s.id},${s.name || ""},${s.email || ""},${s.role},${s.is_active},${s.voting_eligible ?? "unknown"}`)
          .join("\n")
    } else if (reportId === "activity") {
      csvContent =
        "Date,Total Events,Logins,Votes,Approvals\n" +
        activity.map((a) => `${a.date},${a.total},${a.logins},${a.votes},${a.approvals}`).join("\n")
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${reportId}-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <Card className="p-12 text-center text-text-secondary">Loading reports…</Card>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
            <p className="text-gray-500 mt-1">Generated live from the real database.</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <Card className="p-4 flex items-center gap-3 border-error-200 bg-error-50">
            <AlertTriangle className="w-5 h-5 text-error-500" />
            <p className="text-sm text-error-600">{error}</p>
          </Card>
        )}

        {/* Report type selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((report) => (
            <Card
              key={report.id}
              className={`p-5 cursor-pointer transition-all hover:shadow-md ${activeReport === report.id ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setActiveReport(activeReport === report.id ? null : report.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-blue-50">
                  <report.icon className="h-5 w-5 text-blue-600" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    handleExportCSV(report.id)
                  }}
                  aria-label="Download CSV"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              <h3 className="font-bold text-gray-900">{report.label}</h3>
              <p className="text-sm text-gray-500 mt-1">{report.description}</p>
            </Card>
          ))}
        </div>

        {/* Participation Report */}
        {(!activeReport || activeReport === "participation") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Participation Report</h2>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportCSV("participation")}>
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
            {stats ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Total Students", value: stats.students.total },
                  { label: "Active", value: stats.students.active },
                  { label: "Voting Eligible", value: stats.students.voting_eligible },
                  { label: "Ballots Cast", value: stats.votes.total },
                  { label: "Unique Voters", value: stats.votes.unique_voters },
                  { label: "Participation", value: `${participationRate}%` },
                ].map((item) => (
                  <div key={item.label} className="text-center p-3 rounded-xl bg-gray-50">
                    <p className="text-2xl font-bold text-gray-900">{item.value.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No statistics available.</p>
            )}
          </Card>
        )}

        {/* Candidate Report */}
        {(!activeReport || activeReport === "candidates") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Vote className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Candidate Report</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">{applications.length} Applications</Badge>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportCSV("candidates")}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>
            {applications.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No candidate applications submitted yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">ID</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Name</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Department</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Position</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((c) => (
                      <tr key={c.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">#{c.id}</td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{c.fullName}</td>
                        <td className="px-3 py-2.5 text-gray-600">{c.department}</td>
                        <td className="px-3 py-2.5 text-gray-600">{c.position}</td>
                        <td className="px-3 py-2.5">
                          <Badge variant={getStatusBadgeVariant(c.status)} size="sm">{c.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Student Report */}
        {(!activeReport || activeReport === "students") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Student Report</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">{students.length} Accounts</Badge>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportCSV("students")}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>
            {students.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No student accounts yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Name</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Email</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Role</th>
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Voting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-gray-900">{s.name || "—"}</td>
                        <td className="px-3 py-2.5 text-gray-600">{s.email || "—"}</td>
                        <td className="px-3 py-2.5">{s.role}</td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant={s.voting_eligible === true ? "success" : s.voting_eligible === false ? "neutral" : "warning"}
                            size="sm"
                          >
                            {s.voting_eligible === true ? "Eligible" : s.voting_eligible === false ? "Not Eligible" : "?"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Activity Report */}
        {(!activeReport || activeReport === "activity") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Activity Report</h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="info">{activity.length} Days</Badge>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleExportCSV("activity")}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </div>
            {activity.length === 0 ? (
              <div className="p-8 text-center">
                <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No audit activity recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Total Events</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Logins</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Votes</th>
                      <th className="text-right px-3 py-2 font-semibold text-gray-500">Approvals</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activity.map((a) => (
                      <tr key={a.date} className="border-b border-gray-100 last:border-0">
                        <td className="px-3 py-2.5 font-medium text-gray-900">{a.date}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{a.total}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{a.logins}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{a.votes}</td>
                        <td className="px-3 py-2.5 text-right text-gray-600">{a.approvals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
