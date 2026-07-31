"use client";

// A tiny interactive island inside an otherwise-static Server Component
// page. Toggles every checkbox with a given `name` inside the given
// form -- plain DOM lookups rather than React state, since the page
// around it isn't a client component and doesn't need to be for this.
export function SelectAllCheckbox({ formId, checkboxName }: { formId: string; checkboxName: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className="h-4 w-4 rounded border-gray-300"
      onChange={(e) => {
        const form = document.getElementById(formId);
        form?.querySelectorAll<HTMLInputElement>(`input[name="${checkboxName}"]`).forEach((cb) => {
          cb.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
