import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

export default async function ParentAttendancePage() {
  const supabase = createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  const studentIds = (students ?? []).map((s) => s.id);

  const { data: allRecords } = studentIds.length
    ? await supabase
        .from("attendance_records")
        .select("student_id, date, status")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .limit(200)
    : { data: [] as { student_id: string; date: string; status: string }[] };

  const recordsByStudent = new Map<string, { date: string; status: string }[]>();
  for (const rec of allRecords ?? []) {
    const list = recordsByStudent.get(rec.student_id) ?? [];
    if (list.length < 20) list.push(rec);
    recordsByStudent.set(rec.student_id, list);
  }

  return (
    <>
      <PageHeader title="Attendance" description="Recent attendance for each child." />

      {(students ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">No children on your household yet.</p>
      ) : (
        students!.map((student) => {
          const records = recordsByStudent.get(student.id) ?? [];
          return (
            <SectionCard key={student.id} title={`${student.first_name} ${student.last_name}`}>
              {records.length === 0 ? (
                <p className="text-sm text-gray-400">No attendance recorded yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {records.map((r, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-500">{r.date}</span>
                      <span
                        className={
                          r.status === "present"
                            ? "font-medium text-emerald-600"
                            : r.status === "absent"
                            ? "font-medium text-red-600"
                            : "font-medium text-amber-600"
                        }
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          );
        })
      )}
    </>
  );
}
