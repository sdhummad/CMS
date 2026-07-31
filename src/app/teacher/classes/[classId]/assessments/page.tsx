import { createClient } from "@/lib/supabase/server";
import { createAssessment, setScore } from "@/app/teacher/actions/assessments";

const ASSESSMENT_TYPES = ["quiz", "surprise_quiz", "midterm", "final", "homework_grade"] as const;

export default async function ClassAssessmentsPage({ params }: { params: { classId: string } }) {
  const supabase = createClient();
  const classId = params.classId;

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
    .limit(15);

  const assessmentIds = (assessments ?? []).map((a) => a.id);

  const { data: scores } = assessmentIds.length
    ? await supabase.from("assessment_scores").select("assessment_id, student_id, score").in("assessment_id", assessmentIds)
    : { data: [] as { assessment_id: string; student_id: string; score: number }[] };

  const scoreByKey = new Map((scores ?? []).map((s) => [`${s.assessment_id}:${s.student_id}`, s.score]));

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">New assessment</h2>
        <form action={createAssessment} className="flex flex-wrap gap-2">
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
      </section>

      {(assessments ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">No quizzes or exams recorded yet.</p>
      ) : (
        (assessments ?? []).map((a) => (
          <section key={a.id} className="rounded-xl border border-gray-200 bg-white p-5">
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
          </section>
        ))
      )}
    </div>
  );
}
