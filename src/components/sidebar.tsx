"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

export interface SidebarItem {
  href: string;
  label: string;
  // A pre-rendered icon element (e.g. `<Layers className="h-4 w-4" />`),
  // not a component reference. Layouts that build SidebarSection[] are
  // Server Components passing data into this Client Component -- a raw
  // component function can't cross that boundary as a prop (React can
  // only serialize actual elements/children across it), so every caller
  // renders its icon before handing it over.
  icon: React.ReactNode;
  // Root/overview links (e.g. "/teacher") should only light up on an
  // exact match -- without this, every nested route under it (like
  // "/teacher/classes/x/attendance") would make the Overview link look
  // active too, which defeats the point of highlighting where you are.
  exact?: boolean;
  // Nested pages under this item (e.g. a class's Attendance/Weekly Plan/
  // Quizzes & Exams/Report Cards). Rendered indented underneath, but only
  // while this item is the active one -- keeps the sidebar from turning
  // into 4x-as-many-classes links once a teacher has more than one or two.
  subItems?: SidebarSubItem[];
}

export interface SidebarSubItem {
  href: string;
  label: string;
}

export interface SidebarSection {
  heading?: string;
  items: SidebarItem[];
}

function isActive(pathname: string, item: SidebarItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavLinks({ sections, onNavigate }: { sections: SidebarSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {sections.map((section, i) => (
        <div key={i}>
          {section.heading && (
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {section.heading}
            </p>
          )}
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              // A parent with subItems expands them once you're anywhere
              // inside it, not just on exact match -- e.g. a class stays
              // expanded while you're on its Attendance, Plans, etc. pages.
              const expanded = !!item.subItems && active;
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                      active
                        ? "bg-indigo-50 font-medium text-indigo-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                  {expanded && (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-gray-100 pl-3">
                      {item.subItems!.map((sub) => {
                        const subActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onNavigate}
                            className={`block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                              subActive ? "font-medium text-indigo-700" : "text-gray-500 hover:text-gray-900"
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function RoleSidebar({
  appName,
  roleLabel,
  userName,
  sections,
}: {
  appName: string;
  roleLabel: string;
  userName: string;
  sections: SidebarSection[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar -- the sidebar itself is hidden below md, this is
          the only chrome visible until the drawer is opened. */}
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-800">{appName}</span>
        <div className="w-8" />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-gray-800">{appName}</p>
                <p className="text-xs text-gray-400">{roleLabel}</p>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks sections={sections} onNavigate={() => setMobileOpen(false)} />
            <div className="border-t border-gray-100 px-4 py-3">
              <p className="mb-2 truncate text-xs text-gray-500">{userName}</p>
              <SignOutButton />
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-100 px-4 py-4">
          <p className="text-sm font-semibold text-gray-800">{appName}</p>
          <p className="text-xs text-gray-400">{roleLabel}</p>
        </div>
        <NavLinks sections={sections} />
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="mb-2 truncate text-xs text-gray-500">{userName}</p>
          <SignOutButton />
        </div>
      </div>
    </>
  );
}
