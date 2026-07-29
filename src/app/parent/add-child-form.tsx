"use client";

import { useFormState, useFormStatus } from "react-dom";
import { addChild, type AddChildResult } from "./actions/add-child";

const initialState: AddChildResult = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[#3b5bdb] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? "Adding…" : "Add child"}
    </button>
  );
}

export function AddChildForm() {
  const [state, formAction] = useFormState(addChild, initialState);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-3">
      <input
        name="first_name"
        placeholder="First name"
        required
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        name="last_name"
        placeholder="Last name"
        required
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <input
        name="date_of_birth"
        type="date"
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
      <div className="sm:col-span-3 flex items-center gap-3">
        <SubmitButton />
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
