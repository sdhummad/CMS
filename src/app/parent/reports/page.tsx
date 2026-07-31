import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ReportCardView } from "@/components/report-card-view";
import type { ReportCardSnapshot } from "@/types/database";

interface FinalizedReport {
  snapshot: ReportCardSnapshot;
  finalized_at: string;
  reporting_periods: { label: string } | null;
}

export default async function ParentReportsPage() {
  const supabase = createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("status", "active")
    .order("first_name");

  const studentIds = (students ?? []).map((s) => s.id);

  // finalized_at is not null is redundant with RLS (parents can never
  // see a draft report_cards row at all) but kept explicit here for
  // the same reason as the homework query -- defense in depth reads
  // clearly even if the policy ever changes.
  const { data: finalizedReports } = studentIds.length
    ? await supabase
        .from("report_cards")
        .select("student_id, snapshot, finalized_at, reporting_periods(label)")
        .in("student_id", studentIds)
        .not("finalized_at", "is", null)
        .order("finalized_at", { ascending: false })
    : { data: [] as (FinalizedReport & { student_id: string })[] };

  const reportsByStudent = new Map<string, FinalizedReport[]>();
  for (const report of finalizedReports ?? []) {
    const list = reportsByStudent.get(report.student_id) ?? [];
    if (list.length < 8) list.push(report);
    reportsByStudent.set(report.student_id, list);
  }

  return (
    <>
      <PageHeader title="Report Cards" description="Finalized, consolidated reports for each child." />

      {(students ?? []).length === 0 ? (
        <p className="text-sm text-gray-500">No children on your household yet.</p>
      ) : (
        students!.map((student) => {
          const reports = reportsByStudent.get(student.id) ?? [];
          return (
            <div key={student.id} className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                {student.first_name} {student.last_name}
              </h2>
              {reports.length === 0 ? (
                <p className="text-sm text-gray-400">No report cards finalized yet.</p>
              ) : (
                <div className="space-y-4">
                  {reports.map((r, i) => (
                    <ReportCardView
                      key={i}
                      periodLabel={r.reporting_periods?.label ?? r.snapshot.period.label}
                      snapshot={r.snapshot}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </>
  );
}
