import { redirect } from "next/navigation";

// Consolidated into the student portal login page (Register tab).
export default function Page() {
  redirect("/student/login?tab=register");
}
