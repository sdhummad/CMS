import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

// No RESEND_API_KEY (e.g. local dev before the account exists) just
// logs instead of throwing -- a missing email provider shouldn't be
// able to break attendance-taking.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_ADDRESS = process.env.NOTIFICATIONS_FROM_EMAIL ?? "Gujarati Class <notifications@example.org>";

export async function sendAbsenceEmail({
  studentId,
  classId,
  date,
}: {
  studentId: string;
  classId: string;
  date: string;
}) {
  const supabase = createClient();

  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name, household_id")
    .eq("id", studentId)
    .single();
  if (!student) return;

  // A household may have signed up by phone only -- if there's no
  // email on file, there's nothing to send; this isn't an error.
  const { data: contact } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("household_id", student.household_id)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();
  if (!contact?.email) return;

  const { data: klass } = await supabase
    .from("classes")
    .select("name")
    .eq("id", classId)
    .single();

  if (!resend) {
    console.log(
      `[email skipped: RESEND_API_KEY not set] absence notice for ${student.first_name} ${student.last_name} -> ${contact.email}`
    );
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: contact.email,
    subject: `${student.first_name} was marked absent — ${date}`,
    html: `<p>Hi ${contact.full_name ?? "there"},</p><p>${student.first_name} ${student.last_name} was marked absent from ${
      klass?.name ?? "class"
    } on ${date}.</p><p>If this doesn't look right, reply to this email or let the teacher know.</p>`,
  });
}

// No PDF (decided) -- the finalized snapshot is rendered directly as the
// email body. The same snapshot is also what the parent dashboard shows,
// so the email and the in-app view can never drift from each other.
export async function sendReportCardEmail({ reportCardId }: { reportCardId: string }) {
  const supabase = createClient();

  const { data: reportCard } = await supabase
    .from("report_cards")
    .select("student_id, snapshot")
    .eq("id", reportCardId)
    .single();
  if (!reportCard?.snapshot) return;

  const { data: student } = await supabase
    .from("students")
    .select("first_name, last_name, household_id")
    .eq("id", reportCard.student_id)
    .single();
  if (!student) return;

  const { data: contact } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("household_id", student.household_id)
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();
  if (!contact?.email) return;

  const { period, attendance, assessments } = reportCard.snapshot;
  const attendancePct = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null;

  // Table-based layout with everything inlined -- email clients (Outlook
  // especially) strip <style> blocks and don't support flex/grid, so this
  // can't reuse the Tailwind classes the parent dashboard uses even
  // though it's aiming for the same look.
  const chip = (label: string, count: number, bg: string, fg: string) =>
    `<td style="padding:0 6px 6px 0"><span style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;white-space:nowrap">${count} ${label}</span></td>`;

  const attendanceChips = `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${chip(
    "present",
    attendance.present,
    "#ecfdf5",
    "#047857"
  )}${chip("late", attendance.late, "#fffbeb", "#b45309")}${chip(
    "absent",
    attendance.absent,
    "#fef2f2",
    "#b91c1c"
  )}${chip("excused", attendance.excused, "#f3f4f6", "#4b5563")}</tr></table>`;

  const scoreBadge = (score: number | null, maxScore: number) => {
    if (score === null) {
      return `<span style="display:inline-block;background:#f3f4f6;color:#9ca3af;border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600">Not recorded</span>`;
    }
    const pct = Math.round((score / maxScore) * 100);
    const [bg, fg] = pct >= 80 ? ["#ecfdf5", "#047857"] : pct >= 60 ? ["#fffbeb", "#b45309"] : ["#fef2f2", "#b91c1c"];
    return `<span style="display:inline-block;background:${bg};color:${fg};border-radius:999px;padding:4px 10px;font-size:12px;font-weight:700">${score} / ${maxScore} · ${pct}%</span>`;
  };

  const assessmentRows = assessments.length
    ? assessments
        .map(
          (a, i) => `<tr>
            <td style="padding:10px 12px;border-top:${i === 0 ? "none" : "1px solid #f3f4f6"}">
              <div style="font-size:14px;color:#374151;font-weight:500">${a.title}</div>
              <div style="font-size:11px;color:#9ca3af;text-transform:capitalize">${a.type.replace("_", " ")} · ${a.date}</div>
            </td>
            <td style="padding:10px 12px;text-align:right;border-top:${i === 0 ? "none" : "1px solid #f3f4f6"}">${scoreBadge(a.score, a.max_score)}</td>
          </tr>`
        )
        .join("")
    : `<tr><td style="padding:10px 12px;color:#9ca3af;font-size:13px">No quizzes or exams recorded this period.</td></tr>`;

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto">
    <p style="color:#374151;font-size:14px">Hi ${contact.full_name ?? "there"},</p>
    <p style="color:#374151;font-size:14px">${student.first_name} ${student.last_name}'s report is ready.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;margin-top:12px">
      <tr>
        <td style="background:#4f46e5;padding:16px 18px;color:#ffffff">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:15px;font-weight:700">${period.label}</td>
              ${attendancePct !== null ? `<td style="text-align:right;font-size:20px;font-weight:800">${attendancePct}%<div style="font-size:10px;font-weight:400;opacity:.85">attendance</div></td>` : ""}
            </tr>
          </table>
          <div style="font-size:11px;color:#e0e7ff;margin-top:2px">${period.start_date} – ${period.end_date}</div>
        </td>
      </tr>
      <tr>
        <td style="background:#ffffff;padding:16px 18px">
          <div style="font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#9ca3af;margin-bottom:8px">Attendance</div>
          ${attendanceChips}
          <div style="font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:#9ca3af;margin:16px 0 4px">Quizzes &amp; exams</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f3f4f6;border-radius:8px">${assessmentRows}</table>
        </td>
      </tr>
    </table>

    <p style="color:#9ca3af;font-size:12px;margin-top:16px">Sign in to the portal to view this any time.</p>
  </div>`;

  if (!resend) {
    console.log(
      `[email skipped: RESEND_API_KEY not set] report card for ${student.first_name} ${student.last_name} -> ${contact.email}`
    );
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: contact.email,
    subject: `${student.first_name}'s report — ${period.label}`,
    html,
  });
}
