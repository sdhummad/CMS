"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { sendReportCardEmail } from "@/lib/email/resend";
import type { AttendanceStatus, ReportCardSnapshot } from "@/types/database";

// Generates (or regenerates) a snapshot for every student currently
// enrolled in the class, for the given reporting period. Like
// attendance/weekly-plans, this uses *current* enrollment rather than
// reconstructing who was enrolled during the period itself -- the same
// simplification the rest of the app already makes, documented once
// here rather than silently repeated.
//
// A student whose report is already finalized is skipped entirely: once
// finalized_at is set, regenerating must never silently rewrite a report
// a parent may have already received.
export async function generateReportCards(formData: FormData) {
  const { supabase, userId } = await requireRole("teacher");

  const classId = String(formData.get("class_id") ?? "");
  const reportingPeriodId = String(formData.get("reporting_period_id") ?? "");
  if (!classId || !reportingPeriodId) return;

  const { data: owned } = await supabase
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("teacher_profile_id", userId)
    .maybeSingle();
  if (!owned) return;

  const { data: period } = await supabase
    .from("reporting_periods")
    .select("label, start_date, end_date")
    .eq("id", reportingPeriodId)
    .single();
  if (!period) return;

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("class_id", classId)
    .is("end_date", null);
  const studentIds = (enrollments ?? []).map((e) => e.student_id);
  if (studentIds.length === 0) return;

  const { data: existing } = await supabase
    .from("report_cards")
    .select("student_id, finalized_at")
    .eq("class_id", classId)
    .eq("reporting_period_id", reportingPeriodId);
  const finalizedStudentIds = new Set(
    (existing ?? []).filter((r) => r.finalized_at).map((r) => r.student_id)
  );

  const { data: attendanceRows } = await supabase
    .from("attendance_records")
    .select("student_id, status")
    .eq("class_id", classId)
    .gte("date", period.start_date)
    .lte("date", period.end_date);

  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, title, type, date, max_score")
    .eq("class_id", classId)
    .gte("date", period.start_date)
    .lte("date", period.end_date);

  const assessmentIds = (assessments ?? []).map((a) => a.id);
  const { data: scores } = assessmentIds.length
    ? await supabase
        .from("assessment_scores")
        .select("assessment_id, student_id, score")
        .in("assessment_id", assessmentIds)
    : { data: [] as { assessment_id: string; student_id: string; score: number }[] };

  const rows = studentIds
    .filter((studentId) => !finalizedStudentIds.has(studentId))
    .map((studentId) => {
      const attendance = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      for (const rec of attendanceRows ?? []) {
        if (rec.student_id !== studentId) continue;
        attendance[rec.status as AttendanceStatus] += 1;
        attendance.total += 1;
      }

      const studentAssessments = (assessments ?? []).map((a) => ({
        title: a.title,
        type: a.type,
        date: a.date,
        max_score: a.max_score,
        score: (scores ?? []).find((s) => s.assessment_id === a.id && s.student_id === studentId)?.score ?? null,
      }));

      const snapshot: ReportCardSnapshot = {
        period: { label: period.label, start_date: period.start_date, end_date: period.end_date },
        attendance,
        assessments: studentAssessments,
      };

      return {
        student_id: studentId,
        class_id: classId,
        reporting_period_id: reportingPeriodId,
        snapshot,
        generated_at: new Date().toISOString(),
      };
    });

  if (rows.length > 0) {
    await supabase.from("report_cards").upsert(rows, { onConflict: "student_id,reporting_period_id" });
  }

  revalidatePath("/teacher", "layout");
}

export async function finalizeReportCard(formData: FormData) {
  const { supabase, userId } = await requireRole("teacher");

  const reportCardId = String(formData.get("report_card_id") ?? "");
  if (!reportCardId) return;

  const { data: reportCard } = await supabase
    .from("report_cards")
    .select("id, class_id, student_id, finalized_at")
    .eq("id", reportCardId)
    .single();
  if (!reportCard || reportCard.finalized_at) return;

  const { data: owned } = await supabase
    .from("classes")
    .select("id")
    .eq("id", reportCard.class_id)
    .eq("teacher_profile_id", userId)
    .maybeSingle();
  if (!owned) return;

  await supabase
    .from("report_cards")
    .update({ finalized_at: new Date().toISOString(), finalized_by: userId })
    .eq("id", reportCardId);

  // Best-effort, same pattern as the absence email: a failed send must
  // never undo the finalize that already happened.
  try {
    await sendReportCardEmail({ reportCardId });
    await supabase
      .from("report_cards")
      .update({ emailed_at: new Date().toISOString() })
      .eq("id", reportCardId);
  } catch (emailError) {
    console.error("report card email failed", emailError);
  }

  revalidatePath("/teacher", "layout");
  revalidatePath("/parent", "layout");
}
