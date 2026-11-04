import type { ReactNode } from "react";

export function TutorStudentCard({
  name,
  email,
  phone,
  children,
}: {
  name: string;
  email: string;
  phone: string | null | undefined;
  children: ReactNode;
}) {
  return (
    <article className="space-y-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-4">
      <div>
        <h3 className="font-semibold">{name}</h3>
        <p className="mt-1 break-all text-sm text-brand-textMuted">{email}</p>
        <p className="mt-1 text-sm text-brand-textMuted">
          {phone || "Brak telefonu"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </article>
  );
}
