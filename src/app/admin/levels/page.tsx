import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { createLevel } from "../actions/levels-and-terms";

export default async function LevelsPage() {
  const supabase = createClient();

  const { data: levels } = await supabase.from("levels").select("id, name").order("sort_order");

  return (
    <>
      <PageHeader title="Levels" description="The grade/skill levels every class is defined against." />

      <SectionCard title="Levels" description="e.g. 1A, 1B, 2, 3 ... 7">
        <table className="mb-3 w-full text-sm">
          <tbody>
            {(levels ?? []).map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="py-2">{l.name}</td>
              </tr>
            ))}
            {(levels ?? []).length === 0 && (
              <tr>
                <td className="py-2 text-gray-400">No levels yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        <form action={createLevel} className="flex gap-2">
          <input
            name="name"
            placeholder="e.g. 1A"
            required
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Add level
          </button>
        </form>
      </SectionCard>
    </>
  );
}
