import { redirect } from "next/navigation";

// Consolidated into the unified auth page.
export default function Page() {
  redirect("/login?role=student");
}
