import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import type { SidebarSection } from "@/components/sidebar";
import { LayoutDashboard, BookOpen } from "lucide-react";

// Gates every /teacher/* page, same reasoning as the admin layout: this
// is the redirect boundary, not the security boundary -- requireRole()
// in every server action and RLS in Postgres are what actually enforce
// who can read or write what.
export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "teacher") redirect("/");

  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, levels(name)")
    .eq("teacher_profile_id", user.id)
    .order("name");

  // Icons are rendered here (not passed as bare component references) --
  // AppShell/RoleSidebar is a Client Component, and a function reference
  // can't cross the Server->Client prop boundary, only actual elements.
  const iconClass = "h-4 w-4 shrink-0";
  const sections: SidebarSection[] = [
    { items: [{ href: "/teacher", label: "Overview", icon: <LayoutDashboard className={iconClass} />, exact: true }] },
  ];

  if (classes && classes.length > 0) {
    sections.push({
      heading: "My Classes",
      items: classes.map((c: any) => ({
        href: `/teacher/classes/${c.id}`,
        label: c.levels?.name ? `${c.levels.name} — ${c.name}` : c.name,
        icon: <BookOpen className={iconClass} />,
      })),
    });
  }

  return (
    <AppShell appName="Gujarati Class Portal" roleLabel="Teacher" userName={profile?.full_name ?? "Teacher"} sections={sections}>
      {children}
    </AppShell>
  );
}
