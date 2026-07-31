import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { SelectAllCheckbox } from "@/components/select-all-checkbox";
import { placeStudentsBulk } from "../actions/placement";

export default async function StudentsPage() {
  const supabase = createClient();

  const [{ data: activeStudents }, { data: classesRaw }] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name").eq("status", "active").order("first_name"),
    supabase.from("classes").select("id, name, levels(name)"),
  ]);

  const { data: activeEnrollments } = await supabase
    .from("enrollments")
    .select("student_id, class_id")
    .is("end_date", null);

  const classByStudent = new Map((activeEnrollments ?? []).map((e) => [e.student_id, e.class_id]));
  const placed = (activeStudents ?? []).filter((s) => classByStudent.has(s.id));
  const unplaced = (activeStudents ?? []).filter((s) => !classByStudent.has(s.id));
  const classById = new Map((classesRaw ?? []).map((c: any) => [c.id, c]));

  return (
    <>
      <PageHeader title="Students" description="Every active student, and where they're placed." />

      {unplaced.length > 0 && (
        <SectionCard
          title="Needs placement"
          description={`These ${unplaced.length} student${unplaced.length === 1 ? "" : "s"} aren't in a class yet. Select any number and place them into one class at once.`}
        >
          <form id="bulk-place-form" action={placeStudentsBulk}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <select
                name="class_id"
                required
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
              >
                <option value="">Assign selected to class…</option>
                {(classesRaw ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.levels?.name ? `${c.levels.name} — ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
              <button className="rounded-lg border border-indigo-600 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
                Place selected
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="w-8 py-1.5 font-normal">
                    <SelectAllCheckbox formId="bulk-place-form" checkboxName="student_ids" />
                  </th>
                  <th className="py-1.5 font-normal">Name</th>
                </tr>
              </thead>
              <tbody>
                {unplaced.map((s) => (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="py-2">
                      <input type="checkbox" name="student_ids" value={s.id} className="h-4 w-4 rounded border-gray-300" />
                    </td>
                    <td className="py-2">
                      {s.first_name} {s.last_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Placed students">
        {placed.length === 0 ? (
          <p className="text-sm text-gray-500">No students placed yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {placed.map((s) => {
                const klass = classById.get(classByStudent.get(s.id) as string) as any;
                return (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="py-2">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="py-2 text-gray-500">
                      {klass?.levels?.name ? `${klass.levels.name} — ` : ""}
                      {klass?.name ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );
}
