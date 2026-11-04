import type { RefObject } from "react";
import type { ScheduleLesson } from "../hooks/useAdminSchedule";
import { formatDateLong } from "../utils/date";

interface AdminLessonDetailsDialogProps {
  lesson: ScheduleLesson | null;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onClose: () => void;
}

export function AdminLessonDetailsDialog({
  lesson,
  headingRef,
  onClose,
}: AdminLessonDetailsDialogProps) {
  if (!lesson) return null;

  return (
    <div
      className="fixed inset-0 z-60 grid place-items-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-lesson-details-title"
        className="w-full max-w-lg space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 shadow-2xl"
      >
        <h2
          id="admin-lesson-details-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-bold text-white"
        >
          {lesson.subject.name}
        </h2>
        <p className="text-sm text-brand-textMuted">
          {formatDateLong(lesson.lesson_date)} · {lesson.start_time}–
          {lesson.end_time}
        </p>
        <p className="text-sm text-brand-textMuted">
          Korepetytor: {lesson.tutor.first_name} {lesson.tutor.last_name}
        </p>
        <p className="text-sm text-brand-textMuted">
          Uczniowie:{" "}
          {lesson.bookings.length > 0
            ? lesson.bookings
                .map(
                  ({ student }) => `${student.first_name} ${student.last_name}`,
                )
                .join(", ")
            : "Wolny termin"}
        </p>
        <p className="text-sm text-brand-textMuted">Status: {lesson.status}</p>
        {lesson.cancelled_at && (
          <p className="text-sm text-red-300">
            Odwołano {new Date(lesson.cancelled_at).toLocaleString("pl-PL")}
            {lesson.cancelled_by_user &&
              ` przez ${lesson.cancelled_by_user.first_name} ${lesson.cancelled_by_user.last_name}`}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-brand-black"
        >
          Zamknij
        </button>
      </section>
    </div>
  );
}
