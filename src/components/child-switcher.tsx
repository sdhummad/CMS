import Link from "next/link";

interface ChildOption {
  id: string;
  label: string;
}

// Plain links, not client-side state -- the selected child lives in the
// URL (?child=id), so this needs no "use client" boundary and the choice
// is bookmarkable/shareable. Only renders once there's more than one
// child; a single-child household has nothing to switch between.
export function ChildSwitcher({
  basePath,
  students,
  selectedId,
}: {
  basePath: string;
  students: ChildOption[];
  selectedId: string;
}) {
  if (students.length <= 1) return null;

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {students.map((s) => {
        const active = s.id === selectedId;
        return (
          <Link
            key={s.id}
            href={`${basePath}?child=${s.id}`}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              active
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
