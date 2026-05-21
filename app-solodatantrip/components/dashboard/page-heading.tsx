export function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-[#111827] sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-[#6b7280] sm:text-base">{description}</p>
    </div>
  );
}
