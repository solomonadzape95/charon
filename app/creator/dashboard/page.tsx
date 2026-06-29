import { redirect } from "next/navigation";

// The creator studio now lives at its own surface, separate from the reader.
export default function CreatorDashboardRedirect() {
  redirect("/creator/studio");
}
