"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";

// Placing a student into a class never overwrites history: any
// existing open enrollment (end_date is null) is closed out with
// today's date, then a new enrollment row is added. This is what lets
// the app show a student's full class history across terms later.
export async function placeStudent(formData: FormData) {
  const { supabase } = await requireRole("admin");

  const studentId = String(formData.get("student_id") ?? "");
  const classId = String(formData.get("class_id") ?? "");
  if (!studentId || !classId) return;

  const today = new Date().toISOString().slice(0, 10);

  await supabase
    .from("enrollments")
    .update({ end_date: today })
    .eq("student_id", studentId)
    .is("end_date", null);

  await supabase.from("enrollments").insert({
    student_id: studentId,
    class_id: classId,
    start_date: today,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/parent", "layout");
  revalidatePath("/teacher", "layout");
}
