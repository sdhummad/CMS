import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/types/database";

/**
 * Every admin/teacher server action calls this first. RLS enforces the
 * same boundary again at the database layer, but checking explicitly
 * here means a non-admin hitting one of these actions gets a clear
 * "Not authorized" failure instead of a silently-ignored RLS rejection
 * -- authorization checked on the server for every sensitive action,
 * per security-basics, not just inferred from which page rendered a
 * button.
 */
export async function requireRole(role: Role) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== role) {
    throw new Error("Not authorized.");
  }

  return { supabase, userId: user.id };
}
