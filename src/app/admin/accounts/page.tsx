import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SectionCard } from "@/components/section-card";
import { updateProfileRole } from "../actions/profiles";

export default async function AccountsPage() {
  const supabase = createClient();

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role")
    .order("role")
    .order("full_name");

  return (
    <>
      <PageHeader title="Accounts" description="Every signed-in household, teacher, and admin." />

      <SectionCard title={`${allProfiles?.length ?? 0} accounts`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="py-2 font-normal">Name</th>
              <th className="py-2 font-normal">Contact</th>
              <th className="py-2 font-normal">Role</th>
              <th className="py-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {(allProfiles ?? []).map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="py-2">{p.full_name}</td>
                <td className="py-2 text-gray-500">{p.email ?? p.phone}</td>
                <td className="py-2 capitalize">{p.role}</td>
                <td className="py-2">
                  <form action={updateProfileRole} className="flex gap-2">
                    <input type="hidden" name="profile_id" value={p.id} />
                    <select
                      name="role"
                      defaultValue={p.role}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                    >
                      <option value="parent">parent</option>
                      <option value="teacher">teacher</option>
                      <option value="admin">admin</option>
                    </select>
                    <button className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium hover:bg-gray-50">
                      Update
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </>
  );
}
