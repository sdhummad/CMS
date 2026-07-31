import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [
    { data: activeStudents },
    { data: households },
    { data: classesRaw },
    { data: teachers },
  ] = await Promise.all([
    supabase.from("students").select("id").eq("status", "active"),
    supabase.from("households").select("id"),
    supabase.from("classes").select("id, name, teacher_profile_id"),
    supabase.from("profiles").select("id").eq("role", "teacher"),
  ]);

  const { data: activeEnrollments } = await supabase
    .from("enrollments")
    .select("student_id")
    .is("end_date", null);

  const enrolledStudentIds = new Set((activeEnrollments ?? []).map((e) => e.student_id));
  const unplacedCount = (activeStudents ?? []).filter((s) => !enrolledStudentIds.has(s.id)).length;
  const unassignedClassCount = (classesRaw ?? []).filter((c) => !c.teacher_profile_id).length;

  return (
    <>
      <PageHeader title="Overview" description="A snapshot of the whole school." />

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Active students", activeStudents?.length ?? 0],
          ["Households", households?.length ?? 0],
          ["Classes", classesRaw?.length ?? 0],
          ["Teachers", teachers?.length ?? 0],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-2xl font-semibold">{value as number}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      {(unplacedCount > 0 || unassignedClassCount > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-800">Needs attention</h2>
          <ul className="space-y-1 text-sm text-amber-800">
            {unplacedCount > 0 && (
              <li>
                {unplacedCount} student{unplacedCount === 1 ? "" : "s"} not yet placed into a class —{" "}
                <Link href="/admin/students" className="underline">
                  place them
                </Link>
              </li>
            )}
            {unassignedClassCount > 0 && (
              <li>
                {unassignedClassCount} class{unassignedClassCount === 1 ? "" : "es"} without a teacher —{" "}
                <Link href="/admin/accounts" className="underline">
                  promote an account to teacher
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  );
}
