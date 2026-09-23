/**
 * Canonical course + batch (section + year) data for the entire VoteWeb project.
 *
 * Batch = a section paired with a year, e.g. "A1 (2nd Year)".
 * Courses without sections (MBA, MCA, BCom) have batches that are just the year.
 *
 * DB mapping:
 *   department     = course name
 *   year_or_semester = year (e.g. "2nd Year")
 *   section        = section code (e.g. "A1") or "" for section-less courses
 */

export type Course = "MBA" | "MCA" | "BBA" | "BCom" | "BCA" | "TEST";

export type Year = "1st Year" | "2nd Year" | "3rd Year";

export type Section = "" | "A1" | "A2" | "A3" | "T1";

export interface Batch {
  /** Display label, e.g. "A1 (2nd Year)" or "(1st Year)" */
  label: string;
  section: Section;
  year: Year;
}

export const COURSES: Course[] = ["MBA", "MCA", "BBA", "BCom", "BCA", "TEST"];

const MBA_BATCHES: Batch[] = [
  { label: "1st Year", section: "", year: "1st Year" },
  { label: "2nd Year", section: "", year: "2nd Year" },
];

const MCA_BATCHES: Batch[] = [
  { label: "1st Year", section: "", year: "1st Year" },
  { label: "2nd Year", section: "", year: "2nd Year" },
];

const BBA_BATCHES: Batch[] = [
  { label: "A1 (1st Year)", section: "A1", year: "1st Year" },
  { label: "A2 (1st Year)", section: "A2", year: "1st Year" },
  { label: "A3 (1st Year)", section: "A3", year: "1st Year" },
  { label: "A1 (2nd Year)", section: "A1", year: "2nd Year" },
  { label: "A2 (2nd Year)", section: "A2", year: "2nd Year" },
  { label: "A3 (2nd Year)", section: "A3", year: "2nd Year" },
  { label: "A1 (3rd Year)", section: "A1", year: "3rd Year" },
  { label: "A2 (3rd Year)", section: "A2", year: "3rd Year" },
  { label: "A3 (3rd Year)", section: "A3", year: "3rd Year" },
];

const BCOM_BATCHES: Batch[] = [
  { label: "1st Year", section: "", year: "1st Year" },
  { label: "2nd Year", section: "", year: "2nd Year" },
  { label: "3rd Year", section: "", year: "3rd Year" },
];

const BCA_BATCHES: Batch[] = [
  { label: "A1 (1st Year)", section: "A1", year: "1st Year" },
  { label: "A2 (1st Year)", section: "A2", year: "1st Year" },
  { label: "A1 (2nd Year)", section: "A1", year: "2nd Year" },
  { label: "A2 (2nd Year)", section: "A2", year: "2nd Year" },
  { label: "A1 (3rd Year)", section: "A1", year: "3rd Year" },
  { label: "A2 (3rd Year)", section: "A2", year: "3rd Year" },
];

const TEST_BATCHES: Batch[] = [
  { label: "T1 (1st Year)", section: "T1", year: "1st Year" },
];

const BATCHES_BY_COURSE: Record<Course, Batch[]> = {
  MBA: MBA_BATCHES,
  MCA: MCA_BATCHES,
  BBA: BBA_BATCHES,
  BCom: BCOM_BATCHES,
  BCA: BCA_BATCHES,
  TEST: TEST_BATCHES,
};

/** All unique years across every course (for filter dropdowns). */
export const ALL_YEARS: Year[] = ["1st Year", "2nd Year", "3rd Year"];

/** Get the batch options for a given course. */
export function getBatchesForCourse(course: Course): Batch[] {
  return BATCHES_BY_COURSE[course] || [];
}

/**
 * Find the batch entry that matches a department + year + section triple
 * (the shape stored in the database).
 */
export function findBatch(department: string, year: string, section: string | null | undefined): Batch | undefined {
  const batches = getBatchesForCourse(department as Course);
  const sec = (section || "").trim();
  return batches.find((b) => b.year === year && b.section === sec);
}

/** Build the seat label used in admin tables and constituency display. */
export function seatLabel(department: string, year: string, section: string | null | undefined): string {
  const parts = [department, year];
  const sec = (section || "").trim();
  if (sec) parts.push(`Section ${sec}`);
  return parts.filter(Boolean).join(" ");
}

/** All unique courses seen in real data + the canonical list (for filter dropdowns). */
export function getAllCourses(seenInData: string[]): string[] {
  const set = new Set<string>([...COURSES, ...seenInData]);
  return Array.from(set);
}

/**
 * Normalize a stored department value (e.g. legacy "BCOM") to the canonical
 * spelling (e.g. "BCom"). Returns "" if it matches no course.
 */
export function normalizeCourse(department: string | null | undefined): Course | "" {
  const value = (department || "").trim();
  if (!value) return "";
  return COURSES.find((c) => c.toLowerCase() === value.toLowerCase()) || "";
}

const ORDINAL_SUFFIX = { 1: "st", 2: "nd", 3: "rd" } as const;

export function normalizeYear(year: string | null | undefined): Year | string {
  const trimmed = (year || "").trim();
  if (!trimmed) return "";
  if (/^\d+(st|nd|rd|th)\s+Year$/i.test(trimmed)) return trimmed;
  const semMatch = trimmed.match(/^(\d+)\s*Sem$/i);
  if (semMatch) {
    const sem = parseInt(semMatch[1], 10);
    const n = Math.max(1, Math.ceil(sem / 2));
    const suffix = ORDINAL_SUFFIX[n as 1 | 2 | 3] || "th";
    return `${n}${suffix} Year`;
  }
  return trimmed;
}
