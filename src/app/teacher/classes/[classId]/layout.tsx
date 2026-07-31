import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ClassLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { classId: string };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Scoping this select to teacher_profile_id = user.id (not just id)
  // means a teacher who guesses another class's URL gets redirected, not
  // an RLS error -- RLS enforces the same boundary again underneath.
  // Cast to `any` -- the hand-written Database type doesn't model
  // embedded relationships (see types/database.ts), so a `.select()`
  // with a nested resource like `levels(name)` infers as `never`
  // otherwise. Same workaround already used throughout the admin/parent
  // pages for the same reason.
  const { data: klassRaw } = await supabase
    .from("classes")
    .select("id, name, schedule, levels(name)")
    .eq("id", params.classId)
    .eq("teacher_profile_id", user.id)
    .maybeSingle();
  const klass = klassRaw as any;
  if (!klass) redirect("/teacher");

  // Navigation between this class's Attendance/Weekly Plan/Quizzes & Exams/
  // Report Cards now lives in the sidebar (expanded under the class), not
  // a top tab bar -- consistent with how admin/parent navigation works.
  return (
    <div>
      <Link href="/teacher" className="text-xs text-gray-400 hover:text-gray-600">
        ← All classes
      </Link>
      <h1 className="mb-1 mt-1 text-xl font-semibold text-gray-900">
        {klass.levels?.name ? `${klass.levels.name} — ` : ""}
        {klass.name}
      </h1>
      {klass.schedule && <p className="mb-5 text-sm text-gray-500">{klass.schedule}</p>}

      {children}
    </div>
  );
}
