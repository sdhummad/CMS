"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";

// Shared by both actions below: validates the class belongs to the
// signed-in teacher, then upserts the plan's content fields. `publish`
// controls whether `published_at` is included in the payload at all --
// leaving it out of the draft-save payload means an existing published
// plan doesn't get silently unpublished just because the teacher edited
// the homework text. RLS enforces the same ownership check again at the
// database layer.
async function upsertPlan(formData: FormData, publish: boolean) {
  const { supabase, userId } = await requireRole("teacher");

  const classId = String(formData.get("class_id") ?? "");
  const weekStartDate = String(formData.get("week_start_date") ?? "");
  const topics = String(formData.get("topics") ?? "");
  const classwork = String(formData.get("classwork") ?? "");
  const homework = String(formData.get("homework") ?? "");

  if (!classId || !weekStartDate) return;

  const { data: owned } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_profile_id", userId)
    .maybeSingle();
  if (!owned) return;

  const payload: Record<string, unknown> = {
    class_id: classId,
    week_start_date: weekStartDate,
    topics,
    classwork,
    homework,
  };
  if (publish) {
    payload.published_at = new Date().toISOString();
  }

  await supabase.from("weekly_plans").upsert(payload, { onConflict: "class_id,week_start_date" });

  revalidatePath("/teacher");
  revalidatePath("/parent");
}

export async function saveDraftPlan(formData: FormData) {
  await upsertPlan(formData, false);
}

export async function publishPlan(formData: FormData) {
  await upsertPlan(formData, true);
}
