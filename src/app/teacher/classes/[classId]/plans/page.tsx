import { createClient } from "@/lib/supabase/server";
import { saveDraftPlan, publishPlan } from "@/app/teacher/actions/weekly-plan";

export default async function ClassPlansPage({ params }: { params: { classId: string } }) {
  const supabase = createClient();
  const classId = params.classId;
  const date = new Date().toISOString().slice(0, 10);

  const { data: plans } = await supabase
    .from("weekly_plans")
    .select("id, week_start_date, topics, classwork, homework, published_at")
    .eq("class_id", classId)
    .order("week_start_date", { ascending: false })
    .limit(8);

  const current = (plans ?? []).find((p) => p.week_start_date === date);
  const others = (plans ?? []).filter((p) => p.week_start_date !== date);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">This week&apos;s plan</h2>

      <form action={saveDraftPlan} className="space-y-2">
        <input type="hidden" name="class_id" value={classId} />
        <input
          name="week_start_date"
          type="date"
          defaultValue={current?.week_start_date ?? date}
          required
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="topics"
          placeholder="Topics covered this week"
          defaultValue={current?.topics ?? ""}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="classwork"
          placeholder="Classwork"
          defaultValue={current?.classwork ?? ""}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <textarea
          name="homework"
          placeholder="Homework"
          defaultValue={current?.homework ?? ""}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Save draft
          </button>
          <button
            formAction={publishPlan}
            className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Publish (visible to parents)
          </button>
          {current?.published_at && <span className="text-xs text-emerald-600">Published</span>}
        </div>
      </form>

      {others.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-gray-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Previous weeks</p>
          {others.map((p) => (
            <div key={p.id} className="flex justify-between text-xs text-gray-500">
              <span>Week of {p.week_start_date}</span>
              <span className={p.published_at ? "text-emerald-600" : "text-gray-400"}>
                {p.published_at ? "Published" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
