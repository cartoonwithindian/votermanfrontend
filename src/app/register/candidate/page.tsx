import { redirect } from "next/navigation";

// Consolidated into the unified auth page (Register tab).
export default function Page() {
  redirect("/login?tab=register&role=candidate");
}
