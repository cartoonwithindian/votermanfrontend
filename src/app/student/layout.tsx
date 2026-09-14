"use client";

import React from "react";
import { RequireProfile } from "@/components/auth/RequireProfile";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RequireProfile>{children}</RequireProfile>;
}
