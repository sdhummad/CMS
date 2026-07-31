import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ChildSwitcher } from "@/components/child-switcher";
import { ReportCardView } from "@/components/report-card-view";
import type { ReportCardSnapshot } from "@/types/database";

interface FinalizedReport {
  snapshot: ReportCardSnapshot;
  finalized_at: string;
  reporting_periods: { label: string } | null;
}

export default async function ParentReportsPage({
  searchParams,
}: {
  searchParams: { child?: string };
}) {
  const supabase = createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  if (!students || students.length === 0) {
    return (
      <>
        <PageHeader title="Report Cards" description="Finalized, consolidated reports for your child." />
        <p className="text-sm text-gray-500">No children on your household yet.</p>
      </>
    );
  }

  const validIds = new Set(students.map((s) => s.id));
  const selectedId = searchParams.child && validIds.has(searchParams.child) ? searchParams.child : students[0].id;
  const selected = students.find((s) => s.id === selectedId)!;

  // finalized_at is not null is redundant with RLS (parents can never
  // see a draft report_cards row at all) but kept explicit here for
  // the same reason as the homework query -- defense in depth reads
  // clearly even if the policy ever changes.
  const { data: reports } = await supabase
    .from("report_cards")
    .select("snapshot, finalized_at, reporting_periods(label)")
    .eq("student_id", selectedId)
    .not("finalized_at", "is", null)
    .order("finalized_at", { ascending: false })
    .limit(8);

  return (
    <>
      <PageHeader title="Report Cards" description="Finalized, consolidated reports for your child." />

      <ChildSwitcher
        basePath="/parent/reports"
        selectedId={selectedId}
        students={students.map((s) => ({ id: s.id, label: `${s.first_name} ${s.last_name}` }))}
      />

      <h2 className="mb-3 text-sm font-semibold text-gray-700">
        {selected.first_name} {selected.last_name}
      </h2>
      {(reports ?? []).length === 0 ? (
        <p className="text-sm text-gray-400">No report cards finalized yet.</p>
      ) : (
        <div className="space-y-4">
          {((reports ?? []) as unknown as FinalizedReport[]).map((r, i) => (
            <ReportCardView
              key={i}
              periodLabel={r.reporting_periods?.label ?? r.snapshot.period.label}
              snapshot={r.snapshot}
            />
          ))}
        </div>
      )}
    </>
  );
}
