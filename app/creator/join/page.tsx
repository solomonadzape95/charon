import { redirect } from "next/navigation";

// Auth is unified — creators sign in with the same account as readers.
export default function CreatorJoinRedirect() {
  redirect("/join");
}
