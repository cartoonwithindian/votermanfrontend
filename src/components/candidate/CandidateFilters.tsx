"use client";

import React from "react";

interface Filters {
  gender: string;
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

export const CandidateFilters: React.FC<CandidateFiltersProps> = ({
  filters,
  onFilterChange,
}) => {
  const handleChange = (key: keyof Filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap items-end gap-4">
      {/* Gender filter - candidates are pre-scoped to the student's own
          course / year / section by the backend; gender is the only filter */}
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
    </div>
  );
};