import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { AddChildForm } from "../add-child-form";

export default async function HouseholdPage() {
  const supabase = createClient();

  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, date_of_birth, status")
    .order("status")
    .order("first_name");

  return (
    <>
      <PageHeader title="Household" description="Everyone registered under your account." />

      <SectionCard title="Children">
        {(students ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No children added yet.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {(students ?? []).map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="py-2">
                    {s.first_name} {s.last_name}
                  </td>
                  <td className="py-2 text-gray-500">{s.date_of_birth ?? "—"}</td>
                  <td className="py-2">
                    {s.status === "active" ? (
                      <span className="text-emerald-600">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Add a child">
        <AddChildForm />
      </SectionCard>
    </>
  );
}
