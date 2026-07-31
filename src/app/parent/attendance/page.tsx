import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { ChildSwitcher } from "@/components/child-switcher";

export default async function ParentAttendancePage({
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
        <PageHeader title="Attendance" description="Recent attendance for your child." />
        <p className="text-sm text-gray-500">No children on your household yet.</p>
      </>
    );
  }

  // Show one child at a time instead of stacking every child's history
  // on one page -- ?child picks which one, defaulting to the first.
  // Falls back rather than trusting the query string if it doesn't match
  // a student actually in this household (RLS would block the query
  // anyway, but this keeps the page from rendering an empty state for a
  // typo'd id instead of just showing something real).
  const validIds = new Set(students.map((s) => s.id));
  const selectedId = searchParams.child && validIds.has(searchParams.child) ? searchParams.child : students[0].id;
  const selected = students.find((s) => s.id === selectedId)!;

  const { data: records } = await supabase
    .from("attendance_records")
    .select("date, status")
    .eq("student_id", selectedId)
    .order("date", { ascending: false })
    .limit(30);

  return (
    <>
      <PageHeader title="Attendance" description="Recent attendance for your child." />

      <ChildSwitcher
        basePath="/parent/attendance"
        selectedId={selectedId}
        students={students.map((s) => ({ id: s.id, label: `${s.first_name} ${s.last_name}` }))}
      />

      <SectionCard title={`${selected.first_name} ${selected.last_name}`}>
        {(records ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No attendance recorded yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {(records ?? []).map((r, i) => (
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
    </>
  );
}
