import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { AddChildForm } from "./add-child-form";

// Shape of the joined enrollment -> class -> level/teacher query below.
// Hand-typed because the nested select isn't covered by our hand-written
// Database type (see types/database.ts) -- swap for generated types once
// this is wired to a real Supabase project.
interface ClassInfo {
  id: string;
  name: string;
  schedule: string | null;
  levels: { name: string } | null;
  teacher: { full_name: string } | null;
}

interface WeeklyPlan {
  week_start_date: string;
  topics: string | null;
  classwork: string | null;
  homework: string | null;
}

export default async function ParentPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, status")
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

  const classIds = [...new Set([...classByStudent.values()].filter(Boolean).map((c) => c!.id))];

  // Only published plans are ever returned here for a parent -- RLS
  // hides drafts from anyone but the teacher/admin, so this query can't
  // accidentally leak an unpublished plan even if the filter below were
  // removed.
  const { data: publishedPlans } = classIds.length
    ? await supabase
        .from("weekly_plans")
        .select("class_id, week_start_date, topics, classwork, homework")
        .in("class_id", classIds)
        .not("published_at", "is", null)
        .order("week_start_date", { ascending: false })
    : { data: [] as (WeeklyPlan & { class_id: string })[] };

  const plansByClass = new Map<string, WeeklyPlan[]>();
  for (const plan of publishedPlans ?? []) {
    const list = plansByClass.get(plan.class_id) ?? [];
    if (list.length < 3) list.push(plan);
    plansByClass.set(plan.class_id, list);
  }

  const { data: recentAttendance } = studentIds.length
    ? await supabase
        .from("attendance_records")
        .select("student_id, date, status")
        .in("student_id", studentIds)
        .order("date", { ascending: false })
        .limit(40)
    : { data: [] as { student_id: string; date: string; status: string }[] };

  const attendanceByStudent = new Map<string, { date: string; status: string }[]>();
  for (const rec of recentAttendance ?? []) {
    const list = attendanceByStudent.get(rec.student_id) ?? [];
    if (list.length < 5) list.push(rec);
    attendanceByStudent.set(rec.student_id, list);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Welcome back, {profile?.full_name ?? "there"}
          </h1>
          <p className="text-sm text-gray-500">Parent account</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-2">
        {(students ?? []).map((student) => {
          const classInfo = classByStudent.get(student.id);
          const attendance = attendanceByStudent.get(student.id) ?? [];
          const plans = classInfo ? plansByClass.get(classInfo.id) ?? [] : [];
          return (
            <div
              key={student.id}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <h3 className="font-medium">
                {student.first_name} {student.last_name}
              </h3>
              {classInfo ? (
                <p className="mb-3 text-xs text-gray-500">
                  {classInfo.levels?.name ?? "Unplaced"} · {classInfo.schedule ?? classInfo.name}
                  {classInfo.teacher ? ` · ${classInfo.teacher.full_name}` : ""}
                </p>
              ) : (
                <p className="mb-3 text-xs text-amber-600">
                  Not yet placed into a class
                </p>
              )}
              {attendance.length > 0 && (
                <div className="space-y-1 border-t border-gray-100 pt-2 text-xs">
                  {attendance.map((a, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-500">{a.date}</span>
                      <span
                        className={
                          a.status === "present"
                            ? "text-emerald-600"
                            : a.status === "absent"
                            ? "text-red-600"
                            : "text-amber-600"
                        }
                      >
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {plans.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-gray-100 pt-2 text-xs">
                  {plans.map((p, i) => (
                    <div key={i}>
                      <p className="mb-0.5 font-medium text-gray-600">Week of {p.week_start_date}</p>
                      {p.topics && <p className="text-gray-500">Topics: {p.topics}</p>}
                      {p.classwork && <p className="text-gray-500">Classwork: {p.classwork}</p>}
                      {p.homework && <p className="text-gray-500">Homework: {p.homework}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold">Add a child</h2>
        <AddChildForm />
      </div>
    </main>
  );
}
