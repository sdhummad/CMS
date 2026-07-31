import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

export default async function TeacherOverviewPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, schedule, levels(name)")
    .eq("teacher_profile_id", user!.id)
    .order("name");

  const classIds = (classes ?? []).map((c: any) => c.id);
  const { data: enrollments } = classIds.length
    ? await supabase.from("enrollments").select("class_id").in("class_id", classIds).is("end_date", null)
    : { data: [] as { class_id: string }[] };

  const studentCountByClass = new Map<string, number>();
  for (const e of enrollments ?? []) {
    studentCountByClass.set(e.class_id, (studentCountByClass.get(e.class_id) ?? 0) + 1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: todaysAttendance } = classIds.length
    ? await supabase.from("attendance_records").select("class_id, student_id").in("class_id", classIds).eq("date", today)
    : { data: [] as { class_id: string; student_id: string }[] };
  const markedCountByClass = new Map<string, number>();
  for (const a of todaysAttendance ?? []) {
    markedCountByClass.set(a.class_id, (markedCountByClass.get(a.class_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Overview" description="Your assigned classes." />

      {(classes ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">No class is assigned to you yet — an admin needs to assign one.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(classes ?? []).map((c: any) => {
            const studentCount = studentCountByClass.get(c.id) ?? 0;
            const markedCount = markedCountByClass.get(c.id) ?? 0;
            return (
              <Link
                key={c.id}
                href={`/teacher/classes/${c.id}`}
                className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <h3 className="font-medium text-gray-900">
                  {c.levels?.name ? `${c.levels.name} — ` : ""}
                  {c.name}
                </h3>
                <p className="mb-3 text-xs text-gray-500">{c.schedule}</p>
                <p className="text-xs text-gray-500">
                  {studentCount} student{studentCount === 1 ? "" : "s"} ·{" "}
                  {studentCount > 0 ? (
                    <span className={markedCount === studentCount ? "text-emerald-600" : "text-amber-600"}>
                      {markedCount}/{studentCount} attendance marked today
                    </span>
                  ) : (
                    "no students yet"
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
