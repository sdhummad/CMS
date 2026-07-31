import { redirect } from "next/navigation";

// Levels and Terms are now separate pages under the sidebar's Configure
// section -- keeping this route around (instead of just deleting it) so
// any old bookmark/link still lands somewhere useful.
export default function LevelsAndTermsRedirect() {
  redirect("/admin/levels");
}
