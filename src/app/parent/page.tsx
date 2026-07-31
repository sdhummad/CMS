import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

interface ClassInfo {
  id: string;
  name: string;
  schedule: string | null;
  levels: { name: string } | null;
  teacher: { full_name: string } | null;
}

export default async function ParentOverviewPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  const studentIds = (students ?? []).map((s) => s.id);

  const { data: activeEnrollments } = studentIds.length
    ? await supabase
        .from("enrollments")
        .select("student_id, classes(id, name, schedule, levels(name), teacher:profiles(full_name))")
        .in("student_id", studentIds)
        .is("end_date", null)
    : { data: [] as { student_id: string; classes: ClassInfo | null }[] };

  const classByStudent = new Map<string, ClassInfo | null>(
    (activeEnrollments ?? []).map((e: any) => [e.student_id, e.classes])
  );

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysAttendance } = studentIds.length
    ? await supabase.from("attendance_records").select("student_id, status").in("student_id", studentIds).eq("date", today)
    : { data: [] as { student_id: string; status: string }[] };
  const statusByStudent = new Map((todaysAttendance ?? []).map((a) => [a.student_id, a.status]));

  return (
    <>
      <PageHeader title={`Welcome back, ${profile?.full_name ?? "there"}`} description="A quick look at your household." />

      {(students ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">
          No children on your household yet — add one under <span className="font-medium">Household</span> in the sidebar.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(students ?? []).map((student) => {
            const classInfo = classByStudent.get(student.id);
            const status = statusByStudent.get(student.id);
            return (
              <Link
                key={student.id}
                href={`/parent/attendance?child=${student.id}`}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <h3 className="font-medium text-gray-900">
                  {student.first_name} {student.last_name}
                </h3>
                {classInfo ? (
                  <p className="mt-1 text-xs text-gray-500">
                    {classInfo.levels?.name ?? "Unplaced"} · {classInfo.schedule ?? classInfo.name}
                    {classInfo.teacher ? ` · ${classInfo.teacher.full_name}` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-amber-600">Not yet placed into a class</p>
                )}
                <p className="mt-3 text-xs text-gray-400">
                  Today:{" "}
                  {status ? (
                    <span
                      className={
                        status === "present"
                          ? "font-medium text-emerald-600"
                          : status === "absent"
                          ? "font-medium text-red-600"
                          : "font-medium text-amber-600"
                      }
                    >
                      {status}
                    </span>
                  ) : (
                    "not marked yet"
                  )}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
