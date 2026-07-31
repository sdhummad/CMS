import { RoleSidebar, type SidebarSection } from "./sidebar";

export function AppShell({
  appName,
  roleLabel,
  userName,
  sections,
  children,
}: {
  appName: string;
  roleLabel: string;
  userName: string;
  sections: SidebarSection[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <RoleSidebar appName={appName} roleLabel={roleLabel} userName={userName} sections={sections} />
      <main className="min-w-0 flex-1 px-6 py-8 md:px-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
