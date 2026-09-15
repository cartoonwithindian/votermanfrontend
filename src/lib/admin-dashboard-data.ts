export type ElectionStatus =
  | "draft"
  | "scheduled"
  | "registration_open"
  | "voting_open"
  | "voting_closed"
  | "results_published";

export type CandidateAdminStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "changes_requested"
  | "approved"
  | "rejected";

export type IssueStatus = "open" | "in_review" | "waiting" | "resolved" | "closed";

export interface AdminCandidate {
  id: string;
  name: string;
  position: string;
  department: string;
  year: string;
  section: string;
  enrollmentNumber: string;
  email: string;
  phone: string;
  photo: string | null;
  biography: string;
  manifesto: string;
  campaignTitle: string;
  campaignDescription: string;
  applicationStatus: CandidateAdminStatus;
  profileStatus: string;
  submittedDate: string;
  rejectionReason: string | null;
  adminNote: string | null;
}

export interface AdminStudent {
  id: string;
  name: string;
  department: string;
  year: string;
  eligibility: "Eligible" | "Not Eligible" | "Suspended" | "Pending Verification";
  votingStatus: "Not Voted" | "Voted";
  accountStatus: "Active" | "Suspended" | "Pending";
}

export interface ElectionPosition {
  id: string;
  name: string;
  description: string;
  maxCandidates: number;
  currentCandidates: number;
  order: number;
  status: "Active" | "Inactive";
}

export interface ScheduleEvent {
  id: string;
  event: string;
  date: string;
  time: string;
  description: string;
  status: "Completed" | "Upcoming" | "In Progress";
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: string;
  publishDate: string;
  status: "Draft" | "Scheduled" | "Published" | "Archived";
}

export interface AdminIssue {
  id: string;
  category: string;
  submittedBy: string;
  role: string;
  submittedDate: string;
  status: IssueStatus;
  assignedTo: string;
  description: string;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  admin: string;
  action: string;
  target: string;
  status: string;
}

export const MOCK_ADMIN_ELECTION = {
  name: "Student Council Election 2026",
  year: 2026,
  status: "voting_open" as ElectionStatus,
  votingStart: "10 August 2026 • 9:00 AM",
  votingEnd: "10 August 2026 • 5:00 PM",
  registrationStart: "15 July 2026",
  registrationEnd: "25 July 2026",
  resultsDate: "11 August 2026",
  eligibleStudents: 2846,
  totalCandidates: 24,
  totalPositions: 6,
  ballotsSubmitted: 1742,
  participation: 61.2,
  institution: "National Institute of Technology",
  votingMethod: "Online Single Transferable Vote",
};

export const MOCK_ADMIN_CANDIDATES: AdminCandidate[] = [];

export const MOCK_ADMIN_STUDENTS: AdminStudent[] = [
  { id: "STU-2025-001", name: "Anurag Gupta", department: "BCA", year: "2nd Year", eligibility: "Eligible", votingStatus: "Voted", accountStatus: "Active" },
  { id: "STU-2025-002", name: "Riya Sharma", department: "BCA", year: "1st Year", eligibility: "Eligible", votingStatus: "Not Voted", accountStatus: "Active" },
  { id: "STU-2025-003", name: "Karan Malhotra", department: "BBA", year: "3rd Year", eligibility: "Eligible", votingStatus: "Voted", accountStatus: "Active" },
  { id: "STU-2025-004", name: "Pooja Verma", department: "MCA", year: "2nd Year", eligibility: "Eligible", votingStatus: "Not Voted", accountStatus: "Active" },
  { id: "STU-2025-005", name: "Siddharth Rao", department: "BCA", year: "3rd Year", eligibility: "Eligible", votingStatus: "Voted", accountStatus: "Active" },
  { id: "STU-2025-006", name: "Meera Iyer", department: "BBA", year: "1st Year", eligibility: "Eligible", votingStatus: "Not Voted", accountStatus: "Active" },
  { id: "STU-2025-007", name: "Rahul Das", department: "BCA", year: "2nd Year", eligibility: "Not Eligible", votingStatus: "Not Voted", accountStatus: "Suspended" },
  { id: "STU-2025-008", name: "Sakshi Kulkarni", department: "MBA", year: "3rd Year", eligibility: "Eligible", votingStatus: "Voted", accountStatus: "Active" },
  { id: "STU-2025-009", name: "Varun Chopra", department: "BBA", year: "2nd Year", eligibility: "Pending Verification", votingStatus: "Not Voted", accountStatus: "Pending" },
  { id: "STU-2025-010", name: "Tanvi Bhat", department: "BCA", year: "1st Year", eligibility: "Eligible", votingStatus: "Not Voted", accountStatus: "Active" },
];

export const MOCK_POSITIONS: ElectionPosition[] = [
  { id: "pos-1", name: "President", description: "Head of the Student Council, represents the student body.", maxCandidates: 5, currentCandidates: 4, order: 1, status: "Active" },
  { id: "pos-2", name: "Vice President", description: "Supports the President and oversees council operations.", maxCandidates: 4, currentCandidates: 2, order: 2, status: "Active" },
  { id: "pos-3", name: "General Secretary", description: "Manages administrative functions and council communications.", maxCandidates: 4, currentCandidates: 2, order: 3, status: "Active" },
  { id: "pos-4", name: "Treasurer", description: "Manages student council finances and budget allocation.", maxCandidates: 3, currentCandidates: 1, order: 4, status: "Active" },
  { id: "pos-5", name: "Cultural Secretary", description: "Organizes cultural events and artistic programs.", maxCandidates: 4, currentCandidates: 1, order: 5, status: "Active" },
  { id: "pos-6", name: "Sports Secretary", description: "Manages sports events and athletic programs.", maxCandidates: 4, currentCandidates: 1, order: 6, status: "Active" },
];

export const MOCK_SCHEDULE: ScheduleEvent[] = [
  { id: "s-1", event: "Candidate Registration Opens", date: "15 July 2026", time: "9:00 AM", description: "Students can register as candidates for election positions.", status: "Completed" },
  { id: "s-2", event: "Candidate Registration Closes", date: "25 July 2026", time: "5:00 PM", description: "Deadline for candidate registration.", status: "Completed" },
  { id: "s-3", event: "Candidate Verification", date: "26 – 30 July 2026", time: "—", description: "Admin review and verification of candidate applications.", status: "Completed" },
  { id: "s-4", event: "Campaign Period", date: "1 – 9 August 2026", time: "—", description: "Candidates can campaign and share their manifestos.", status: "In Progress" },
  { id: "s-5", event: "Voting Opens", date: "10 August 2026", time: "9:00 AM", description: "Students can begin casting their votes.", status: "Upcoming" },
  { id: "s-6", event: "Voting Closes", date: "10 August 2026", time: "5:00 PM", description: "Voting period ends.", status: "Upcoming" },
  { id: "s-7", event: "Results Publication", date: "11 August 2026", time: "2:00 PM", description: "Official election results are published.", status: "Upcoming" },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: "a-1", title: "Voting is Now Open", message: "Student Council Election 2026 voting has started. Cast your vote before 5:00 PM on 10 August 2026.", audience: "All Students", publishDate: "10 August 2026", status: "Published" },
  { id: "a-2", title: "Candidate Verification Completed", message: "All candidate applications have been reviewed. 20 candidates have been approved.", audience: "Candidates", publishDate: "31 July 2026", status: "Published" },
  { id: "a-3", title: "Election Results Schedule", message: "Election results will be published on 11 August 2026 at 2:00 PM.", audience: "All Students", publishDate: "9 August 2026", status: "Scheduled" },
  { id: "a-4", title: "Campaign Guidelines Reminder", message: "All candidates are reminded to follow campaign guidelines. Violations may result in disqualification.", audience: "Candidates", publishDate: "5 August 2026", status: "Published" },
  { id: "a-5", title: "Technical Maintenance Notice", message: "The voting system will undergo maintenance on 9 August from 2:00 AM to 4:00 AM.", audience: "All Students", publishDate: "8 August 2026", status: "Archived" },
];

export const MOCK_ISSUES: AdminIssue[] = [
  { id: "SUP-2026-0042", category: "Technical Error", submittedBy: "Anurag Gupta", role: "Student", submittedDate: "13 Aug 2026", status: "open", assignedTo: "Election Support", description: "Unable to load the voting page. The screen stays blank after login." },
  { id: "SUP-2026-0041", category: "Voting Issue", submittedBy: "Riya Sharma", role: "Student", submittedDate: "12 Aug 2026", status: "in_review", assignedTo: "Election Admin", description: "Received an error when trying to submit my vote. Not sure if it went through." },
  { id: "SUP-2026-0040", category: "Candidate Profile", submittedBy: "Aarav Sharma", role: "Candidate", submittedDate: "11 Aug 2026", status: "resolved", assignedTo: "Election Support", description: "Campaign logo not displaying correctly on the public profile page." },
  { id: "SUP-2026-0039", category: "Account Access", submittedBy: "Karan Malhotra", role: "Student", submittedDate: "10 Aug 2026", status: "waiting", assignedTo: "Election Support", description: "Cannot log in to my student account. Password reset not working." },
  { id: "SUP-2026-0038", category: "Receipt Issue", submittedBy: "Pooja Verma", role: "Student", submittedDate: "10 Aug 2026", status: "closed", assignedTo: "Election Admin", description: "Vote receipt ID not found when trying to verify." },
];

export const MOCK_ACTIVITY_LOG: ActivityLogEntry[] = [
  { id: "log-1", timestamp: "13 Aug 2026 • 10:42 AM", admin: "Election Admin", action: "Candidate Approved", target: "CAN-001 Aarav Sharma", status: "Success" },
  { id: "log-2", timestamp: "13 Aug 2026 • 10:20 AM", admin: "Election Admin", action: "Announcement Published", target: "Voting is Now Open", status: "Success" },
  { id: "log-3", timestamp: "12 Aug 2026 • 04:15 PM", admin: "Election Admin", action: "Changes Requested", target: "CAN-006 Ananya Desai", status: "Success" },
  { id: "log-4", timestamp: "12 Aug 2026 • 02:30 PM", admin: "Support Staff", action: "Issue Resolved", target: "SUP-2026-0040", status: "Success" },
  { id: "log-5", timestamp: "11 Aug 2026 • 11:00 AM", admin: "Election Admin", action: "Election Updated", target: "Status changed to Voting Open", status: "Success" },
  { id: "log-6", timestamp: "10 Aug 2026 • 09:05 AM", admin: "Election Admin", action: "Position Created", target: "Sports Secretary", status: "Success" },
  { id: "log-7", timestamp: "10 Aug 2026 • 08:30 AM", admin: "Election Admin", action: "Candidate Rejected", target: "CAN-009 Aditya Joshi", status: "Success" },
  { id: "log-8", timestamp: "09 Aug 2026 • 03:45 PM", admin: "Support Staff", action: "Issue Resolved", target: "SUP-2026-0038", status: "Success" },
];

export const STATUS_OPTIONS = [
  "Draft", "Scheduled", "Registration Open", "Voting Open", "Voting Closed", "Results Published"
];

export const ISSUE_STATUS_MAP: Record<string, { label: string; variant: string }> = {
  open: { label: "Open", variant: "info" },
  in_review: { label: "In Review", variant: "warning" },
  waiting: { label: "Waiting", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
};

export const CANDIDATE_STATUS_MAP: Record<string, { label: string; variant: string }> = {
  draft: { label: "Draft", variant: "neutral" },
  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under Review", variant: "warning" },
  changes_requested: { label: "Changes Requested", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "error" },
};
