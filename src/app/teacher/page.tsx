import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { setAttendance } from "./actions/attendance";
import { saveDraftPlan, publishPlan } from "./actions/weekly-plan";
import { createAssessment, setScore } from "./actions/assessments";

const STATUSES = ["present", "late", "absent", "excused"] as const;
const ASSESSMENT_TYPES = ["quiz", "surprise_quiz", "midterm", "final", "homework_grade"] as const;

export default async function TeacherPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "teacher") redirect("/");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, schedule, levels(name)")
    .eq("teacher_profile_id", user.id);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{profile?.full_name}</h1>
          <p className="text-sm text-gray-500">Teacher account</p>
        </div>
        <SignOutButton />
      </div>

      {(classes ?? []).length === 0 && (
        <p className="text-sm text-gray-500">
          No class is assigned to you yet -- an admin needs to assign one.
        </p>
      )}

      {(classes ?? []).map((klass: any) => (
        <div key={klass.id} className="mb-10">
          <h2 className="mb-3 font-medium">
            {klass.levels?.name ? `${klass.levels.name} — ` : ""}
            {klass.name}
            <span className="ml-2 text-xs font-normal text-gray-500">{klass.schedule}</span>
          </h2>
          <div className="space-y-4">
            <ClassRoster classId={klass.id} date={today} supabase={supabase} />
            <WeeklyPlanCard classId={klass.id} date={today} supabase={supabase} />
            <AssessmentsCard classId={klass.id} supabase={supabase} />
          </div>
        </div>
      ))}
    </main>
  );
}

async function ClassRoster({
  classId,
  date,
  supabase,
}: {
  classId: string;
  date: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_name, last_name)")
    .eq("class_id", classId)
    .is("end_date", null);

  const studentIds = (enrollments ?? []).map((e: any) => e.student_id);

  const { data: todaysAttendance } = studentIds.length
    ? await supabase
        .from("attendance_records")
        .select("student_id, status")
        .eq("class_id", classId)
        .eq("date", date)
    : { data: [] as { student_id: string; status: string }[] };

  const statusByStudent = new Map((todaysAttendance ?? []).map((a) => [a.student_id, a.status]));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Attendance for {date}
      </h3>

      <table className="w-full text-sm">
        <tbody>
          {(enrollments ?? []).map((e: any) => {
            const currentStatus = statusByStudent.get(e.student_id);
            return (
              <tr key={e.student_id} className="border-t border-gray-100">
                <td className="py-2">
                  {e.students.first_name} {e.students.last_name}
                </td>
                <td className="py-2">
                  <div className="flex gap-1">
                    {STATUSES.map((status) => (
                      <form action={setAttendance} key={status}>
                        <input type="hidden" name="class_id" value={classId} />
                        <input type="hidden" name="student_id" value={e.student_id} />
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="status" value={status} />
                        <button
                          className={`rounded-md border px-2 py-1 text-xs capitalize ${
                            currentStatus === status
                              ? statusColor(status)
                              : "border-gray-200 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {status}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-gray-500">
        Marking a student &ldquo;absent&rdquo; sends an automatic email to their household.
      </p>
    </section>
  );
}

async function WeeklyPlanCard({
  classId,
  date,
  supabase,
}: {
  classId: string;
  date: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const { data: plans } = await supabase
    .from("weekly_plans")
    .select("id, week_start_date, topics, classwork, homework, published_at")
    .eq("class_id", classId)
    .order("week_start_date", { ascending: false })
    .limit(5);

  const current = (plans ?? []).find((p) => p.week_start_date === date);
  const others = (plans ?? []).filter((p) => p.week_start_date !== date);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Weekly plan
      </h3>

      <form action={saveDraftPlan} className="space-y-2">
        <input type="hidden" name="class_id" value={classId} />
        <input
          name="week_start_date"
          type="date"
          defaultValue={current?.week_start_date ?? date}
          required
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="topics"
          placeholder="Topics covered this week"
          defaultValue={current?.topics ?? ""}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="classwork"
          placeholder="Classwork"
          defaultValue={current?.classwork ?? ""}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="homework"
          placeholder="Homework"
          defaultValue={current?.homework ?? ""}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Save draft
          </button>
          <button
            formAction={publishPlan}
            className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Publish (visible to parents)
          </button>
          {current?.published_at && (
            <span className="text-xs text-emerald-600">Published</span>
          )}
        </div>
      </form>

      {others.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
          {others.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span>Week of {p.week_start_date}</span>
              <span className={p.published_at ? "text-emerald-600" : "text-gray-400"}>
                {p.published_at ? "Published" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

async function AssessmentsCard({
  classId,
  supabase,
}: {
  classId: string;
  supabase: ReturnType<typeof createClient>;
}) {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_name, last_name)")
    .eq("class_id", classId)
    .is("end_date", null);

  const { data: assessments } = await supabase
    .from("assessments")
    .select("id, type, title, date, max_score")
    .eq("class_id", classId)
    .order("date", { ascending: false })
    .limit(10);

  const assessmentIds = (assessments ?? []).map((a) => a.id);

  const { data: scores } = assessmentIds.length
    ? await supabase
        .from("assessment_scores")
        .select("assessment_id, student_id, score")
        .in("assessment_id", assessmentIds)
    : { data: [] as { assessment_id: string; student_id: string; score: number }[] };

  const scoreByKey = new Map((scores ?? []).map((s) => [`${s.assessment_id}:${s.student_id}`, s.score]));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Quizzes &amp; exams
      </h3>

      <form action={createAssessment} className="mb-4 flex flex-wrap gap-2">
        <input type="hidden" name="class_id" value={classId} />
        <select name="type" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          {ASSESSMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replace("_", " ")}
            </option>
          ))}
        </select>
        <input
          name="title"
          placeholder="Title (e.g. Chapter 3 Quiz)"
          required
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <input name="date" type="date" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        <input
          name="max_score"
          type="number"
          min="1"
          step="0.5"
          placeholder="Max score"
          required
          className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
          Add assessment
        </button>
      </form>

      {(assessments ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">No quizzes or exams recorded yet.</p>
      ) : (
        <div className="space-y-5">
          {(assessments ?? []).map((a) => (
            <div key={a.id} className="border-t border-gray-100 pt-3">
              <p className="mb-2 text-sm font-medium">
                {a.title}{" "}
                <span className="font-normal capitalize text-gray-500">
                  · {a.type.replace("_", " ")} · {a.date} · out of {a.max_score}
                </span>
              </p>
              <table className="w-full text-sm">
                <tbody>
                  {(enrollments ?? []).map((e: any) => {
                    const existing = scoreByKey.get(`${a.id}:${e.student_id}`);
                    return (
                      <tr key={e.student_id} className="border-t border-gray-50">
                        <td className="py-1.5">
                          {e.students.first_name} {e.students.last_name}
                        </td>
                        <td className="py-1.5">
                          <form action={setScore} className="flex items-center gap-2">
                            <input type="hidden" name="assessment_id" value={a.id} />
                            <input type="hidden" name="student_id" value={e.student_id} />
                            <input type="hidden" name="class_id" value={classId} />
                            <input
                              name="score"
                              type="number"
                              min="0"
                              step="0.5"
                              defaultValue={existing ?? ""}
                              placeholder="score"
                              className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                            />
                            <button className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium hover:bg-gray-50">
                              Save
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "present":
      return "border-emerald-600 bg-emerald-50 text-emerald-700";
    case "absent":
      return "border-red-600 bg-red-50 text-red-700";
    default:
      return "border-amber-600 bg-amber-50 text-amber-700";
  }
}
