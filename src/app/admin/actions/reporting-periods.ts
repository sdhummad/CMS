"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";

export async function createReportingPeriod(formData: FormData) {
  const { supabase } = await requireRole("admin");

  const termId = String(formData.get("term_id") ?? "");
  const label = String(formData.get("label") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");

  if (!termId || !label || !startDate || !endDate) return;

  await supabase.from("reporting_periods").insert({
    term_id: termId,
    label,
    start_date: startDate,
    end_date: endDate,
  });

  revalidatePath("/admin", "layout");
  revalidatePath("/teacher", "layout");
}
