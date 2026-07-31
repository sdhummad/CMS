"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";

export async function createLevel(formData: FormData) {
  const { supabase } = await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("levels").insert({ name });
  revalidatePath("/admin", "layout");
}

export async function createTerm(formData: FormData) {
  const { supabase } = await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "");
  if (!name || !startDate || !endDate) return;

  await supabase.from("terms").insert({ name, start_date: startDate, end_date: endDate });
  revalidatePath("/admin", "layout");
}
