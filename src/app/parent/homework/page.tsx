import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { ChildSwitcher } from "@/components/child-switcher";

interface WeeklyPlan {
  week_start_date: string;
  topics: string | null;
  classwork: string | null;
  homework: string | null;
}

export default async function ParentHomeworkPage({
  searchParams,
}: {
  searchParams: { child?: string };
}) {
  const supabase = createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  if (!students || students.length === 0) {
    return (
      <>
        <PageHeader title="Homework" description="Topics, classwork, and homework your child's teacher has published." />
        <p className="text-sm text-gray-500">No children on your household yet.</p>
      </>
    );
  }

  const validIds = new Set(students.map((s) => s.id));
  const selectedId = searchParams.child && validIds.has(searchParams.child) ? searchParams.child : students[0].id;
  const selected = students.find((s) => s.id === selectedId)!;

  const { data: enrollmentRaw } = await supabase
    .from("enrollments")
    .select("classes(id)")
    .eq("student_id", selectedId)
    .is("end_date", null)
    .maybeSingle();
  // Cast to `any` -- embedded `classes(id)` infers as `never` against the
  // hand-written Database type, same workaround used throughout the app.
  const classId = (enrollmentRaw as any)?.classes?.id as string | undefined;

  // Only published plans are ever returned for a parent -- RLS hides
  // drafts from anyone but the teacher/admin, so this filter can't
  // accidentally leak an unpublished plan even if it were removed.
  const { data: plans } = classId
    ? await supabase
        .from("weekly_plans")
        .select("week_start_date, topics, classwork, homework")
        .eq("class_id", classId)
        .not("published_at", "is", null)
        .order("week_start_date", { ascending: false })
        .limit(8)
    : { data: [] as WeeklyPlan[] };

  return (
    <>
      <PageHeader title="Homework" description="Topics, classwork, and homework your child's teacher has published." />

      <ChildSwitcher
        basePath="/parent/homework"
        selectedId={selectedId}
        students={students.map((s) => ({ id: s.id, label: `${s.first_name} ${s.last_name}` }))}
      />

      <SectionCard title={`${selected.first_name} ${selected.last_name}`}>
        {(plans ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">Nothing published yet.</p>
        ) : (
          <div className="space-y-4">
            {(plans ?? []).map((p, i) => (
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
    </>
  );
}
