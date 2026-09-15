"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LockedAccountState } from "@/components/auth/LockedAccountState";

export default function AccountLockedPage() {
  const router = useRouter();
  return (
    <AuthLayout>
      <LockedAccountState
        onTryAgain={() => router.push("/student/login")}
        onContactSupport={() => router.push("/student/help")}
      />
    </AuthLayout>
  );
}