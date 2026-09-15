"use client";

import React from "react";
import { COURSES, type Course } from "@/lib/class-data";

interface CourseSelectProps {
  value: string;
  onChange: (course: Course | "") => void;
  id?: string;
  className?: string;
  required?: boolean;
  showDefault?: boolean;
  disabled?: boolean;
  error?: boolean;
}

export const CourseSelect: React.FC<CourseSelectProps> = ({
  value,
  onChange,
  id = "course",
  className = "",
  required = false,
  showDefault = true,
  disabled = false,
  error = false,
}) => {
  const selectClass =
    "w-full px-4 py-2.5 text-sm bg-white dark:bg-[#252540] border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 " +
    (error ? "border-error-500" : "border-border") +
    (disabled ? " opacity-50 cursor-not-allowed" : " cursor-pointer") +
    (className ? " " + className : "");

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as Course | "")}
      className={selectClass}
      required={required}
      disabled={disabled}
    >
      {showDefault && <option value="">Select course</option>}
      {COURSES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
};
