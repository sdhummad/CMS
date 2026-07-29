import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";
import { createLevel, createTerm } from "./actions/levels-and-terms";
import { createClass } from "./actions/classes";
import { placeStudent } from "./actions/placement";
import { updateProfileRole } from "./actions/profiles";

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (viewerProfile?.role !== "admin") redirect("/");

  const [
    { data: levels },
    { data: terms },
    { data: teachers },
    { data: households },
    { data: activeStudents },
    { data: classesRaw },
    { data: allProfiles },
  ] = await Promise.all([
    supabase.from("levels").select("id, name").order("sort_order"),
    supabase.from("terms").select("id, name, start_date, end_date").order("start_date", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("role", "teacher"),
    supabase.from("households").select("id"),
    supabase.from("students").select("id, first_name, last_name").eq("status", "active"),
    supabase
      .from("classes")
      .select("id, name, schedule, level_id, levels(name), teacher:profiles(full_name)"),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role")
      .order("role")
      .order("full_name"),
  ]);

  const { data: activeEnrollments } = await supabase
    .from("enrollments")
    .select("student_id, class_id")
    .is("end_date", null);

  const enrolledStudentIds = new Set((activeEnrollments ?? []).map((e) => e.student_id));
  const unplacedStudents = (activeStudents ?? []).filter((s) => !enrolledStudentIds.has(s.id));

  const enrollmentCountByClass = new Map<string, number>();
  for (const e of activeEnrollments ?? []) {
    enrollmentCountByClass.set(e.class_id, (enrollmentCountByClass.get(e.class_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Overview</h1>
          <p className="text-sm text-gray-500">Site administrator</p>
        </div>
        <SignOutButton />
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <Section title="Levels">
        <table className="mb-3 w-full text-sm">
          <tbody>
            {(levels ?? []).map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="py-2">{l.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={createLevel} className="flex gap-2">
          <input
            name="name"
            placeholder="e.g. 1A"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Add level
          </button>
        </form>
      </Section>

      <Section title="Terms">
        <table className="mb-3 w-full text-sm">
          <tbody>
            {(terms ?? []).map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="py-2">{t.name}</td>
                <td className="py-2 text-gray-500">
                  {t.start_date} – {t.end_date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form action={createTerm} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="e.g. 2026 Fall"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="start_date"
            type="date"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="end_date"
            type="date"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Add term
          </button>
        </form>
      </Section>

      <Section title="Classes">
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
                <td className="py-2">{c.teacher?.full_name ?? "Unassigned"}</td>
                <td className="py-2">{enrollmentCountByClass.get(c.id) ?? 0}</td>
              </tr>
            ))}
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
      </Section>

      <Section title="Unplaced students">
        {unplacedStudents.length === 0 ? (
          <p className="text-sm text-gray-500">Every active student is placed into a class.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {unplacedStudents.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-2">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="py-2">
                    <form action={placeStudent} className="flex gap-2">
                      <input type="hidden" name="student_id" value={s.id} />
                      <select
                        name="class_id"
                        required
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                      >
                        <option value="">Assign to class…</option>
                        {(classesRaw ?? []).map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.levels?.name ? `${c.levels.name} — ` : ""}
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium hover:bg-gray-50">
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Accounts">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 font-normal">Name</th>
              <th className="py-2 font-normal">Contact</th>
              <th className="py-2 font-normal">Role</th>
              <th className="py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {(allProfiles ?? []).map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="py-2">{p.full_name}</td>
                <td className="py-2 text-gray-500">{p.email ?? p.phone}</td>
                <td className="py-2 capitalize">{p.role}</td>
                <td className="py-2">
                  <form action={updateProfileRole} className="flex gap-2">
                    <input type="hidden" name="profile_id" value={p.id} />
                    <select
                      name="role"
                      defaultValue={p.role}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      <option value="parent">parent</option>
                      <option value="teacher">teacher</option>
                      <option value="admin">admin</option>
                    </select>
                    <button className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium hover:bg-gray-50">
                      Update
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
