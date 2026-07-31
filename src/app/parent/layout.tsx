import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";
import type { SidebarSection } from "@/components/sidebar";
import { LayoutDashboard, ClipboardCheck, NotebookPen, FileBarChart2, Users } from "lucide-react";

// Gates every /parent/* page. The original single-page version never
// checked role at all (any signed-in user landed here) -- adding the
// check here while splitting the page into a layout is a small
// consistency fix, matching how /admin and /teacher already behave.
export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).single();
  if (profile?.role !== "parent") redirect("/");

  // Icons are rendered here (not passed as bare component references) --
  // AppShell/RoleSidebar is a Client Component, and a function reference
  // can't cross the Server->Client prop boundary, only actual elements.
  const iconClass = "h-4 w-4 shrink-0";
  const sections: SidebarSection[] = [
    {
      items: [
        { href: "/parent", label: "Overview", icon: <LayoutDashboard className={iconClass} />, exact: true },
      ],
    },
    {
      heading: "My Children",
      items: [
        { href: "/parent/attendance", label: "Attendance", icon: <ClipboardCheck className={iconClass} /> },
        { href: "/parent/homework", label: "Homework", icon: <NotebookPen className={iconClass} /> },
        { href: "/parent/reports", label: "Report Cards", icon: <FileBarChart2 className={iconClass} /> },
      ],
    },
    {
      items: [{ href: "/parent/household", label: "Household", icon: <Users className={iconClass} /> }],
    },
  ];

  return (
    <AppShell appName="Gujarati Class Portal" roleLabel="Parent" userName={profile?.full_name ?? "Parent"} sections={sections}>
      {children}
    </AppShell>
  );
}
