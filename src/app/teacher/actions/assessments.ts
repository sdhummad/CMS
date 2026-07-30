"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import type { AssessmentType } from "@/types/database";

const VALID_TYPES: AssessmentType[] = ["quiz", "surprise_quiz", "midterm", "final", "homework_grade"];

function isAssessmentType(value: string): value is AssessmentType {
  return (VALID_TYPES as string[]).includes(value);
}

export async function createAssessment(formData: FormData) {
  const { supabase, userId } = await requireRole("teacher");

  const classId = String(formData.get("class_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const title = String(formData.get("title") ?? "");
  const date = String(formData.get("date") ?? "");
  const maxScore = Number(formData.get("max_score") ?? "");

  if (!classId || !title || !date || !isAssessmentType(type) || !(maxScore > 0)) {
    return;
  }

  const { data: owned } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_profile_id", userId)
    .maybeSingle();
  if (!owned) return;

  await supabase.from("assessments").insert({
    class_id: classId,
    type,
    title,
    date,
    max_score: maxScore,
  });

  revalidatePath("/teacher");
}

export async function setScore(formData: FormData) {
  const { supabase, userId } = await requireRole("teacher");

  const assessmentId = String(formData.get("assessment_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  const score = Number(formData.get("score") ?? "");

  if (!assessmentId || !studentId || !classId || Number.isNaN(score) || score < 0) {
    return;
  }

  // Confirm this assessment's class actually belongs to the signed-in
  // teacher before writing a score -- RLS enforces the same rule again,
  // but this gives a clear early exit instead of a silent RLS rejection.
  const { data: owned } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_profile_id", userId)
    .maybeSingle();
  if (!owned) return;

  await supabase
    .from("assessment_scores")
    .upsert(
      { assessment_id: assessmentId, student_id: studentId, score },
      { onConflict: "assessment_id,student_id" }
    );

  revalidatePath("/teacher");
}
