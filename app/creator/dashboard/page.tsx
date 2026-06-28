import { redirect } from "next/navigation";

// The creator studio now lives inside the unified dashboard.
export default function CreatorDashboardRedirect() {
  redirect("/dashboard");
}
