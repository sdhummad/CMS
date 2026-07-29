import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// No public marketing site: every visitor either has a session and
// gets sent to their role's dashboard, or gets sent to sign in.
export default async function Home() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  redirect(`/${profile?.role ?? "parent"}`);
}
