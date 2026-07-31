import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { createClass } from "../actions/classes";

export default async function ClassesPage() {
  const supabase = createClient();

  const [{ data: levels }, { data: terms }, { data: teachers }, { data: classesRaw }] = await Promise.all([
    supabase.from("levels").select("id, name").order("sort_order"),
    supabase.from("terms").select("id, name").order("start_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "teacher"),
    supabase.from("classes").select("id, name, schedule, levels(name), teacher:profiles(full_name)"),
  ]);

  const { data: activeEnrollments } = await supabase
    .from("enrollments")
    .select("class_id")
    .is("end_date", null);
  const enrollmentCountByClass = new Map<string, number>();
  for (const e of activeEnrollments ?? []) {
    enrollmentCountByClass.set(e.class_id, (enrollmentCountByClass.get(e.class_id) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Classes" description="Create a class and assign it a level, term, and teacher." />

      <SectionCard
        title="All classes"
        description={
          teachers?.length === 0
            ? "No accounts are promoted to teacher yet -- promote one under Accounts to assign a teacher here."
            : undefined
        }
      >
        <table className="mb-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 font-normal">Class</th>
              <th className="py-2 font-normal">Level</th>
              <th className="py-2 font-normal">Teacher</th>
              <th className="py-2 font-normal">Students</th>
            </tr>
          </thead>
          <tbody>
            {(classesRaw ?? []).map((c: any) => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="py-2">
                  {c.name}
                  {c.schedule ? <span className="text-gray-500"> · {c.schedule}</span> : null}
                </td>
                <td className="py-2">{c.levels?.name ?? "—"}</td>
                <td className="py-2">
                  {c.teacher?.full_name ?? <span className="text-amber-600">Unassigned</span>}
                </td>
                <td className="py-2">{enrollmentCountByClass.get(c.id) ?? 0}</td>
              </tr>
            ))}
            {(classesRaw ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-2 text-gray-400">
                  No classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <form action={createClass} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="Class name"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="schedule"
            placeholder="Schedule (e.g. Sat 10am)"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <select name="level_id" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Level…</option>
            {(levels ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select name="term_id" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Term…</option>
            {(terms ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select name="teacher_profile_id" className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Teacher (optional)…</option>
            {(teachers ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Create class
          </button>
        </form>
      </SectionCard>
    </>
  );
}
