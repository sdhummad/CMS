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

  const attendanceRows = (["present", "absent", "late", "excused"] as const)
    .map((status) => `<tr><td style="padding:2px 12px 2px 0">${status}</td><td>${attendance[status]}</td></tr>`)
    .join("");

  const assessmentRows = assessments.length
    ? assessments
        .map(
          (a) =>
            `<tr><td style="padding:2px 12px 2px 0">${a.title} <span style="color:#888">(${a.type.replace("_", " ")}, ${a.date})</span></td><td>${a.score ?? "—"} / ${a.max_score}</td></tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="color:#888">No quizzes or exams recorded this period.</td></tr>`;

  const html = `
    <p>Hi ${contact.full_name ?? "there"},</p>
    <p>${student.first_name} ${student.last_name}'s report for <strong>${period.label}</strong>
    (${period.start_date} – ${period.end_date}) is ready.</p>
    <p><strong>Attendance</strong> (${attendance.total} classes recorded)</p>
    <table>${attendanceRows}</table>
    <p><strong>Quizzes &amp; exams</strong></p>
    <table>${assessmentRows}</table>
    <p style="margin-top:16px">Sign in to the portal to view this any time.</p>
  `;

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
