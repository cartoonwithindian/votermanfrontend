"use client";

import React from "react";
import { getBatchesForCourse, type Course, type Section, type Year } from "@/lib/class-data";

interface BatchValue {
  section: Section;
  year: Year | "";
}

interface BatchSelectProps {
  /** Currently selected course — determines which batches are shown. */
  course: Course | "";
  /** Currently selected section + year. */
  value: BatchValue;
  /** Called when the user picks a batch. */
  onChange: (batch: { section: Section; year: Year }) => void;
  id?: string;
  className?: string;
  required?: boolean;
  showDefault?: boolean;
  disabled?: boolean;
  error?: boolean;
  /** When false, hides batches without a section (useful for CR seats, which only sectioned classes have). */
  includeSectionless?: boolean;
}

export const BatchSelect: React.FC<BatchSelectProps> = ({
  course,
  value,
  onChange,
  id = "batch",
  className = "",
  required = false,
  showDefault = true,
  disabled = false,
  error = false,
  includeSectionless = true,
}) => {
  const batches = (course ? getBatchesForCourse(course as Course) : []).filter(
    (b) => includeSectionless || b.section
  );

  const selectClass =
    "w-full px-4 py-2.5 text-sm bg-white dark:bg-[#252540] border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 " +
    (error ? "border-error-500" : "border-border") +
    (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer") +
    (className ? " " + className : "");

  return (
    <select
      id={id}
      value={JSON.stringify({ section: value.section || "", year: value.year || "" })}
      onChange={(e) => {
        try {
          const parsed = JSON.parse(e.target.value);
          onChange(parsed);
        } catch {
          /* no-op */
        }
      }}
      className={selectClass}
      required={required}
      disabled={disabled || !course}
    >
      {showDefault && <option value="">{course ? "Select batch" : "Select course first"}</option>}
      {batches.map((b) => (
        <option
          key={`${b.section}-${b.year}`}
          value={JSON.stringify({ section: b.section, year: b.year })}
        >
          {b.label}
        </option>
      ))}
    </select>
  );
};
