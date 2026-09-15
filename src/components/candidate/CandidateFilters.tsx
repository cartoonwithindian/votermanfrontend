"use client";

import React from "react";
import {
  type CandidateDepartment,
  type CandidateYear,
} from "@/lib/candidate-data";
import { COURSES, ALL_YEARS } from "@/lib/class-data";

interface Filters {
  gender: string;
  department: string;
  year: string;
}

interface CandidateFiltersProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

// Gender filter options for student-facing candidate listing
// Maps to database gender values: Male -> Boys, Female -> Girls, Other stays as Other
const genderOptions = [
  { value: "all", label: "All" },
  { value: "girls", label: "Girls" },
  { value: "boys", label: "Boys" },
];

const departmentOptions = [
  { value: "all", label: "All Courses" },
  ...COURSES.map((c) => ({ value: c, label: c })),
];

const yearOptions = [
  { value: "all", label: "All Years" },
  ...ALL_YEARS.map((y) => ({ value: y, label: y })),
];

export const CandidateFilters: React.FC<CandidateFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleChange = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Gender filter - replaces Position filter */}
      <div className="min-w-[140px]">
        <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
          Gender
        </label>
        <div className="flex gap-1">
          {genderOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange("gender", option.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filters.gender === option.value
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-[140px]">
        <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
          Course
        </label>
        <select
          value={filters.department}
          onChange={(e) => handleChange("department", e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-border text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {departmentOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-[140px]">
        <label className="text-[10px] font-medium text-text-secondary uppercase tracking-wider block mb-1">
          Year
        </label>
        <select
          value={filters.year}
          onChange={(e) => handleChange("year", e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-border text-sm text-text-primary bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          {yearOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
