"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { sendAbsenceEmail } from "@/lib/email/resend";
import type { AttendanceStatus } from "@/types/database";

const VALID_STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (VALID_STATUSES as string[]).includes(value);
}

export async function setAttendance(formData: FormData) {
  const { supabase, userId } = await requireRole("teacher");

  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!classId || !studentId || !date || !isAttendanceStatus(status)) {
    return;
  }

  // Don't trust class_id from the form alone -- confirm this class
  // actually belongs to the signed-in teacher before writing anything.
  // RLS enforces the same rule again at the database layer.
  const { data: owned } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_profile_id", userId)
    .maybeSingle();
  if (!owned) return;

  const { error } = await supabase
    .from("attendance_records")
    .upsert(
      { class_id: classId, student_id: studentId, date, status, marked_by: userId },
      { onConflict: "class_id,student_id,date" }
    );

  if (!error && status === "absent") {
    // Best-effort: a failed email should never undo or block the
    // attendance record that was just saved.
    try {
      await sendAbsenceEmail({ studentId, classId, date });
    } catch (emailError) {
      console.error("absence email failed", emailError);
    }
  }

  revalidatePath("/teacher");
  revalidatePath("/parent");
}
