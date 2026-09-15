import { redirect } from "next/navigation";

// Consolidated into the candidate portal login page (Register tab).
export default function Page() {
  redirect("/candidate/login?tab=register");
}
