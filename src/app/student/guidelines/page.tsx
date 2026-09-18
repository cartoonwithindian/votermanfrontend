"use client";

import React from "react";
import { StudentLayout } from "@/components/layout/StudentLayout";
import { GuidelinesContent } from "@/components/guidelines/GuidelinesContent";

export default function GuidelinesPage() {
  return (
    <StudentLayout>
      <GuidelinesContent />
    </StudentLayout>
  );
}