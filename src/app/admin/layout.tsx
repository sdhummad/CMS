import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import type { SidebarSection } from "@/components/sidebar";
import { LayoutDashboard, Layers, School, Users, CalendarClock, ShieldCheck } from "lucide-react";

// This layout is what actually gates every /admin/* page -- it wraps
// every page in this segment, so the role check here covers all of
// them. Individual pages don't repeat it (the old single-page version
// checked on every load; splitting into pages made that duplication
// obvious). Server actions still call requireRole() independently, and
// RLS enforces the same boundary again in Postgres -- this check is
// about redirecting a logged-in non-admin to the right place, not the
// only thing standing between them and the data.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  // Icons are rendered here (not passed as bare component references) --
  // AppShell/RoleSidebar is a Client Component, and a function reference
  // can't cross the Server->Client prop boundary, only actual elements.
  const iconClass = "h-4 w-4 shrink-0";
  const sections: SidebarSection[] = [
    {
      items: [
        { href: "/admin", label: "Overview", icon: <LayoutDashboard className={iconClass} />, exact: true },
      ],
    },
    {
      heading: "Configure",
      items: [
        { href: "/admin/levels-terms", label: "Levels & Terms", icon: <Layers className={iconClass} /> },
        { href: "/admin/classes", label: "Classes", icon: <School className={iconClass} /> },
        { href: "/admin/students", label: "Students", icon: <Users className={iconClass} /> },
        { href: "/admin/reporting-periods", label: "Reporting Periods", icon: <CalendarClock className={iconClass} /> },
        { href: "/admin/accounts", label: "Accounts", icon: <ShieldCheck className={iconClass} /> },
      ],
    },
  ];

  return (
    <AppShell
      appName="Gujarati Class Portal"
      roleLabel="Site administrator"
      userName={profile?.full_name ?? "Admin"}
      sections={sections}
    >
      {children}
    </AppShell>
  );
}
