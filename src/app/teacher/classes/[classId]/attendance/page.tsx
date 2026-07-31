import { createClient } from "@/lib/supabase/server";
import { setAttendance } from "@/app/teacher/actions/attendance";

const STATUSES = ["present", "late", "absent", "excused"] as const;

export default async function ClassAttendancePage({ params }: { params: { classId: string } }) {
  const supabase = createClient();
  const classId = params.classId;
  const date = new Date().toISOString().slice(0, 10);

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("student_id, students(id, first_name, last_name)")
    .eq("class_id", classId)
    .is("end_date", null);

  const studentIds = (enrollments ?? []).map((e: any) => e.student_id);

  const { data: todaysAttendance } = studentIds.length
    ? await supabase.from("attendance_records").select("student_id, status").eq("class_id", classId).eq("date", date)
    : { data: [] as { student_id: string; status: string }[] };

  const statusByStudent = new Map((todaysAttendance ?? []).map((a) => [a.student_id, a.status]));

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Attendance for {date}</h2>

      {(enrollments ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">No students are placed in this class yet.</p>
      ) : (
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
      )}
      <p className="mt-3 text-xs text-gray-500">
        Marking a student &ldquo;absent&rdquo; sends an automatic email to their household.
      </p>
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
