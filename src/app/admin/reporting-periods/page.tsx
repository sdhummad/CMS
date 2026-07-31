import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { createReportingPeriod } from "../actions/reporting-periods";

export default async function ReportingPeriodsPage() {
  const supabase = createClient();

  const [{ data: terms }, { data: reportingPeriods }] = await Promise.all([
    supabase.from("terms").select("id, name").order("start_date", { ascending: false }),
    supabase
      .from("reporting_periods")
      .select("id, label, start_date, end_date, terms(name)")
      .order("start_date", { ascending: false }),
  ]);

  return (
    <>
      <PageHeader
        title="Reporting Periods"
        description="Windows of time (e.g. Progress Report 1) that teachers generate report cards against."
      />

      <SectionCard title="All periods">
        <table className="mb-3 w-full text-sm">
          <tbody>
            {(reportingPeriods ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="py-2">{p.label}</td>
                <td className="py-2 text-gray-500">{p.terms?.name}</td>
                <td className="py-2 text-gray-500">
                  {p.start_date} – {p.end_date}
                </td>
              </tr>
            ))}
            {(reportingPeriods ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-gray-400">
                  No reporting periods yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <form action={createReportingPeriod} className="flex flex-wrap gap-2">
          <select name="term_id" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Term…</option>
            {(terms ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input
            name="label"
            placeholder="e.g. Progress Report 1"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="start_date"
            type="date"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            name="end_date"
            type="date"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Add period
          </button>
        </form>
      </SectionCard>
    </>
  );
}
