export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-gray-400">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
