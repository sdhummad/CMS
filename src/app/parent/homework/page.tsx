import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";

interface ClassInfo {
  id: string;
}

interface WeeklyPlan {
  week_start_date: string;
  topics: string | null;
  classwork: string | null;
  homework: string | null;
}

export default async function ParentHomeworkPage() {
  const supabase = createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  const studentIds = (students ?? []).map((s) => s.id);

  const { data: activeEnrollments } = studentIds.length
    ? await supabase.from("enrollments").select("student_id, classes(id)").in("student_id", studentIds).is("end_date", null)
    : { data: [] as { student_id: string; classes: ClassInfo | null }[] };

  const classByStudent = new Map<string, ClassInfo | null>(
    (activeEnrollments ?? []).map((e: any) => [e.student_id, e.classes])
  );
  const classIds = [...new Set([...classByStudent.values()].filter(Boolean).map((c) => c!.id))];

  // Only published plans are ever returned for a parent -- RLS hides
  // drafts from anyone but the teacher/admin, so this filter can't
  // accidentally leak an unpublished plan even if it were removed.
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
    if (list.length < 8) list.push(plan);
    plansByClass.set(plan.class_id, list);
  }

  return (
    <>
      <PageHeader title="Homework" description="Topics, classwork, and homework your child's teacher has published." />

      {(students ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">No children on your household yet.</p>
      ) : (
        students!.map((student) => {
          const classInfo = classByStudent.get(student.id);
          const plans = classInfo ? plansByClass.get(classInfo.id) ?? [] : [];
          return (
            <SectionCard key={student.id} title={`${student.first_name} ${student.last_name}`}>
              {plans.length === 0 ? (
                <p className="text-sm text-gray-400">Nothing published yet.</p>
              ) : (
                <div className="space-y-4">
                  {plans.map((p, i) => (
                    <div key={i} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
                      <p className="mb-1 text-sm font-medium text-gray-700">Week of {p.week_start_date}</p>
                      {p.topics && <p className="text-sm text-gray-500">Topics: {p.topics}</p>}
                      {p.classwork && <p className="text-sm text-gray-500">Classwork: {p.classwork}</p>}
                      {p.homework && <p className="text-sm text-gray-500">Homework: {p.homework}</p>}
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
