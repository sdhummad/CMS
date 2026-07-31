"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";

export async function createClass(formData: FormData) {
  const { supabase } = await requireRole("admin");

  const levelId = String(formData.get("level_id") ?? "");
  const termId = String(formData.get("term_id") ?? "");
  const teacherProfileId = String(formData.get("teacher_profile_id") ?? "") || null;
  const name = String(formData.get("name") ?? "").trim();
  const schedule = String(formData.get("schedule") ?? "").trim() || null;

  if (!levelId || !termId || !name) return;

  await supabase.from("classes").insert({
    level_id: levelId,
    term_id: termId,
    teacher_profile_id: teacherProfileId,
    name,
    schedule,
  });

  revalidatePath("/admin", "layout");
}
