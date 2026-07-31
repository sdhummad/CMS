"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AddChildResult = { error: string | null };

// Server action so the household_id is derived from the signed-in
// user's own profile, never trusted from client input -- a parent
// can't add a child to someone else's household by tampering with a
// hidden form field. RLS enforces the same rule again at the database
// layer (defense in depth, per security-basics).
export async function addChild(
  _prev: AddChildResult,
  formData: FormData
): Promise<AddChildResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You need to sign in again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) {
    return { error: "No household is linked to your account." };
  }

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const dateOfBirth = String(formData.get("date_of_birth") ?? "").trim();

  if (!firstName || !lastName) {
    return { error: "First and last name are both required." };
  }

  const { error } = await supabase.from("students").insert({
    household_id: profile.household_id,
    first_name: firstName,
    last_name: lastName,
    date_of_birth: dateOfBirth || null,
  });

  if (error) {
    return { error: "Couldn't save that child. Try again." };
  }

  revalidatePath("/parent", "layout");
  return { error: null };
}
