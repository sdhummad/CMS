import { createClient } from "@/lib/supabase/server";
import { generateReportCards, finalizeReportCard } from "@/app/teacher/actions/report-cards";

export default async function ClassReportsPage({ params }: { params: { classId: string } }) {
  const supabase = createClient();
  const classId = params.classId;

  const { data: klass } = await supabase.from("classes").select("term_id").eq("id", classId).single();

  const { data: periods } = klass
    ? await supabase
        .from("reporting_periods")
        .select("id, label, start_date, end_date")
        .eq("term_id", klass.term_id)
        .order("start_date", { ascending: false })
    : { data: [] as { id: string; label: string; start_date: string; end_date: string }[] };

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_name, last_name)")
    .eq("class_id", classId)
    .is("end_date", null);

  const periodIds = (periods ?? []).map((p) => p.id);
  const { data: reportCards } = periodIds.length
    ? await supabase
        .from("report_cards")
        .select("id, student_id, reporting_period_id, finalized_at, emailed_at")
        .eq("class_id", classId)
        .in("reporting_period_id", periodIds)
    : {
        data: [] as {
          id: string;
          student_id: string;
          reporting_period_id: string;
          finalized_at: string | null;
          emailed_at: string | null;
        }[],
      };

  if (!periods || periods.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="text-sm text-gray-500">
          No reporting periods yet for this class&apos;s term — ask your admin to create one.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {periods.map((period) => {
        const cardByStudent = new Map(
          (reportCards ?? []).filter((rc) => rc.reporting_period_id === period.id).map((rc) => [rc.student_id, rc])
        );
        return (
          <section key={period.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {period.label}{" "}
                <span className="font-normal text-gray-500">
                  · {period.start_date} – {period.end_date}
                </span>
              </p>
              <form action={generateReportCards}>
                <input type="hidden" name="class_id" value={classId} />
                <input type="hidden" name="reporting_period_id" value={period.id} />
                <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
                  Generate for all students
                </button>
              </form>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {(enrollments ?? []).map((e: any) => {
                  const rc = cardByStudent.get(e.student_id);
                  return (
                    <tr key={e.student_id} className="border-t border-gray-50">
                      <td className="py-1.5">
                        {e.students.first_name} {e.students.last_name}
                      </td>
                      <td className="py-1.5 text-right">
                        {!rc && <span className="text-xs text-gray-400">Not generated</span>}
                        {rc && !rc.finalized_at && (
                          <form action={finalizeReportCard} className="inline">
                            <input type="hidden" name="report_card_id" value={rc.id} />
                            <button className="rounded-lg border border-indigo-600 bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700">
                              Finalize &amp; email
                            </button>
                          </form>
                        )}
                        {rc?.finalized_at && (
                          <span className="text-xs text-emerald-600">
                            Finalized {rc.finalized_at.slice(0, 10)}
                            {!rc.emailed_at && " (email pending)"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(enrollments ?? []).length === 0 && (
                  <tr>
                    <td className="py-1.5 text-gray-400">No students placed in this class yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
