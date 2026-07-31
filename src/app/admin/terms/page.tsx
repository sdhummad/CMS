import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { createTerm } from "../actions/levels-and-terms";

export default async function TermsPage() {
  const supabase = createClient();

  const { data: terms } = await supabase
    .from("terms")
    .select("id, name, start_date, end_date")
    .order("start_date", { ascending: false });

  return (
    <>
      <PageHeader title="Terms" description="Classes and reporting periods both belong to a term." />

      <SectionCard title="Terms" description="e.g. 2026 Fall">
        <table className="mb-3 w-full text-sm">
          <tbody>
            {(terms ?? []).map((t) => (
              <tr key={t.id} className="border-t border-gray-100">
                <td className="py-2">{t.name}</td>
                <td className="py-2 text-gray-500">
                  {t.start_date} – {t.end_date}
                </td>
              </tr>
            ))}
            {(terms ?? []).length === 0 && (
              <tr>
                <td className="py-2 text-gray-400">No terms yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        <form action={createTerm} className="flex flex-wrap gap-2">
          <input
            name="name"
            placeholder="e.g. 2026 Fall"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input name="start_date" type="date" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input name="end_date" type="date" required className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Add term
          </button>
        </form>
      </SectionCard>
    </>
  );
}
