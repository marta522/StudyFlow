export function LoadingCards({
  label,
  count = 3,
}: {
  label: string;
  count?: number;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-36 animate-pulse rounded-2xl border border-brand-cardBorder bg-brand-card"
        />
      ))}
    </div>
  );
}
