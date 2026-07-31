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

  const sections: SidebarSection[] = [
    {
      items: [{ href: "/parent", label: "Overview", icon: LayoutDashboard, exact: true }],
    },
    {
      heading: "My Children",
      items: [
        { href: "/parent/attendance", label: "Attendance", icon: ClipboardCheck },
        { href: "/parent/homework", label: "Homework", icon: NotebookPen },
        { href: "/parent/reports", label: "Report Cards", icon: FileBarChart2 },
      ],
    },
    {
      items: [{ href: "/parent/household", label: "Household", icon: Users }],
    },
  ];

  return (
    <AppShell appName="Gujarati Class Portal" roleLabel="Parent" userName={profile?.full_name ?? "Parent"} sections={sections}>
      {children}
    </AppShell>
  );
}
