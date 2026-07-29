"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import type { Role } from "@/types/database";

const VALID_ROLES: Role[] = ["admin", "teacher", "parent"];

function isRole(value: string): value is Role {
  return (VALID_ROLES as string[]).includes(value);
}

// Teacher and admin accounts start as ordinary parent sign-ups (the
// signup trigger only ever creates 'parent' rows) and are promoted by
// an existing admin from here. There's no separate "invite a teacher"
// flow to build for Phase 1 -- the teacher just signs in once, then an
// admin finds them in this list.
export async function updateProfileRole(formData: FormData) {
  const { supabase } = await requireRole("admin");

  const profileId = String(formData.get("profile_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!profileId || !isRole(role)) return;

  await supabase.from("profiles").update({ role }).eq("id", profileId);
  revalidatePath("/admin");
}
