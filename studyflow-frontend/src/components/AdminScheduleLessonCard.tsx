import type { ScheduleLesson } from "../hooks/useAdminSchedule";
import { formatDateLong } from "../utils/date";

export function AdminScheduleLessonCard({
  lesson,
  hasConflict,
  onView,
  onEdit,
  onCancel,
}: {
  lesson: ScheduleLesson;
  hasConflict: boolean;
  onView: () => void;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <article
      className={`space-y-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-4 ${
        lesson.status === "CANCELLED" ? "border-red-500/30 bg-red-500/5" : ""
      }`}
    >
      <button type="button" onClick={onView} className="w-full text-left">
        <h3 className="font-semibold text-brand-yellow">
          {lesson.subject.name}
        </h3>
        <p className="mt-1 text-sm text-brand-textMuted">
          {formatDateLong(lesson.lesson_date)} · {lesson.start_time}–{lesson.end_time}
        </p>
      </button>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-brand-textMuted">Korepetytor</dt>
          <dd>
            {lesson.tutor.first_name} {lesson.tutor.last_name}
          </dd>
        </div>
        <div>
          <dt className="text-brand-textMuted">Uczeń</dt>
          <dd>
            {lesson.bookings.length > 0
              ? lesson.bookings
                  .map(
                    ({ student }) =>
                      `${student.first_name} ${student.last_name}`,
                  )
                  .join(", ")
              : "Wolny termin"}
          </dd>
        </div>
        <div>
          <dt className="text-brand-textMuted">Status</dt>
          <dd>
            {lesson.status === "CANCELLED"
              ? "Odwołana"
              : lesson.status === "COMPLETED"
                ? "Zakończona"
                : "Zaplanowana"}
            {hasConflict && (
              <span className="ml-2 text-red-300">Konflikt</span>
            )}
          </dd>
        </div>
      </dl>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={lesson.status !== "SCHEDULED"}
          onClick={onEdit}
          className="flex-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-yellow disabled:opacity-40"
        >
          Edytuj
        </button>
        <button
          type="button"
          disabled={lesson.status === "COMPLETED"}
          onClick={onCancel}
          className="flex-1 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 disabled:opacity-40"
        >
          Anuluj lekcję
        </button>
      </div>
    </article>
  );
}
