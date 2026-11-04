import axios from "axios";
import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Pencil,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/useAuth";
import { useFeedback } from "./useFeedback";
import {
  useLessonAvailability,
  type AvailableLesson,
  type TutorAvailabilitySlot,
  type TutorStudent,
  type TutorSubjectOffer,
} from "../hooks/useLessonAvailability";

interface ApiError {
  message?: string | string[];
}

const DAYS_BY_NUMBER = [
  "Niedziela",
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
];

function getApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) {
      return "Nie można połączyć się z serwerem. Sprawdź, czy backend działa.";
    }
  }
  return fallback;
}

function formatDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function LessonsList() {
  const { confirm, notify } = useFeedback();
  const { user } = useAuth();
  const {
    fetchLessons,
    fetchTutorOffer,
    fetchTutorAvailability,
    fetchTutorStudents,
    bookLesson,
    saveLesson,
    deleteLesson: removeLesson,
  } = useLessonAvailability();
  const [lessons, setLessons] = useState<AvailableLesson[]>([]);
  const [subjects, setSubjects] = useState<TutorSubjectOffer[]>([]);
  const [students, setStudents] = useState<TutorStudent[]>([]);
  const [availability, setAvailability] = useState<TutorAvailabilitySlot[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [selectedAvailableDate, setSelectedAvailableDate] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [bookingLessonId, setBookingLessonId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const availableByDate = new Map<string, number>();
  lessons.forEach((lesson) => {
    const key = lesson.lesson_date.slice(0, 10);
    availableByDate.set(key, (availableByDate.get(key) ?? 0) + 1);
  });
  const calendarStart = new Date(calendarMonth);
  calendarStart.setDate(1 - ((calendarStart.getDay() + 6) % 7));
  const calendarDates = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
  const visibleLessons = selectedAvailableDate
    ? lessons.filter(
        (lesson) =>
          lesson.lesson_date.slice(0, 10) === selectedAvailableDate,
      )
    : lessons;

  const loadLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLessons(await fetchLessons());
    } catch (requestError: unknown) {
      setError(
        getApiError(requestError, "Nie udało się pobrać dostępnych lekcji."),
      );
    } finally {
      setLoading(false);
    }
  }, [fetchLessons]);

  useEffect(() => {
    let cancelled = false;
    void fetchLessons()
      .then((data) => {
        if (!cancelled) setLessons(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            getApiError(
              requestError,
              "Nie udało się pobrać dostępnych lekcji.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchLessons]);

  useEffect(() => {
    if (user?.role !== "tutor") {
      return;
    }

    let cancelled = false;
    void fetchTutorOffer()
      .then((data) => {
        if (!cancelled) {
          setSubjects(data);
          setSelectedSubject(
            data.length > 0 ? String(data[0].subject.id_subjects) : "",
          );
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setSubjectError(
            getApiError(requestError, "Nie udało się pobrać Twojej oferty."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSubjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchTutorOffer, user?.role]);

  useEffect(() => {
    if (user?.role !== "tutor") return;

    let cancelled = false;
    void fetchTutorAvailability()
      .then((data) => {
        if (!cancelled) setAvailability(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setAvailabilityError(
            getApiError(
              requestError,
              "Nie udało się pobrać Twojej dostępności.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAvailability(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchTutorAvailability, user?.role]);

  useEffect(() => {
    if (user?.role !== "tutor") return;

    let cancelled = false;
    void fetchTutorStudents()
      .then((data) => {
        if (cancelled) return;
        setStudents(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setStudentError(
            getApiError(requestError, "Nie udało się pobrać listy uczniów."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingStudents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchTutorStudents, user?.role]);

  useEffect(() => {
    if (!notice) return;
    notify(notice);
    const timeoutId = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice, notify]);

  useEffect(() => {
    if (error) notify(error, "error");
    if (actionError) notify(actionError, "error");
  }, [actionError, error, notify]);

  async function handleBook(lessonId: number) {
    setBookingLessonId(lessonId);
    setActionError(null);
    setNotice(null);
    try {
      await bookLesson(lessonId);
      setNotice("Pomyślnie zarezerwowano lekcję!");
      await loadLessons();
    } catch (requestError: unknown) {
      setActionError(
        getApiError(requestError, "Nie udało się zarezerwować lekcji."),
      );
      void loadLessons();
    } finally {
      setBookingLessonId(null);
    }
  }

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startTime >= endTime) {
      setActionError(
        "Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.",
      );
      return;
    }
    setSubmitting(true);
    setActionError(null);
    setNotice(null);
    try {
      const lessonData = {
        subject_id: Number(selectedSubject),
        lesson_date: lessonDate,
        start_time: startTime,
        end_time: endTime,
        ...(editingLessonId === null &&
          selectedStudent && { student_id: Number(selectedStudent) }),
      };
      if (editingLessonId === null) {
        await saveLesson(null, lessonData);
        setNotice(
          selectedStudent
            ? "Dodano lekcję i przypisano ją do ucznia."
            : "Dodano nowy wolny termin zajęć.",
        );
      } else {
        await saveLesson(editingLessonId, lessonData);
        setNotice("Zaktualizowano termin zajęć.");
        setEditingLessonId(null);
      }
      setLessonDate("");
      setSelectedStudent("");
      await loadLessons();
    } catch (requestError: unknown) {
      setActionError(
        getApiError(requestError, "Nie udało się dodać terminu zajęć."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function beginEdit(lesson: AvailableLesson) {
    setEditingLessonId(lesson.id_lessons);
    setSelectedSubject(String(lesson.subject.id_subjects));
    setSelectedStudent("");
    setLessonDate(lesson.lesson_date.slice(0, 10));
    setStartTime(lesson.start_time);
    setEndTime(lesson.end_time);
    setActionError(null);
    setNotice(null);
  }

  async function deleteLesson(lesson: AvailableLesson) {
    if (
      !(await confirm(
        `Czy usunąć wolny termin ${lesson.subject.name} z ${lesson.lesson_date.slice(0, 10)}?`,
      ))
    ) {
      return;
    }
    setDeletingLessonId(lesson.id_lessons);
    setActionError(null);
    setNotice(null);
    try {
      await removeLesson(lesson.id_lessons);
      setNotice("Termin zajęć został usunięty.");
      await loadLessons();
    } catch (requestError: unknown) {
      setActionError(
        getApiError(requestError, "Nie udało się usunąć terminu zajęć."),
      );
    } finally {
      setDeletingLessonId(null);
    }
  }

  return (
    <div className="space-y-8">
      {notice && (
        <div
          className="flex items-center gap-3 rounded-xl border border-brand-yellow bg-brand-yellow/10 p-4 text-brand-yellow"
          role="status"
          aria-live="polite"
        >
          <CheckCircle className="size-5 shrink-0" aria-hidden="true" />
          {notice}
        </div>
      )}

      {actionError && (
        <div
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
          role="alert"
        >
          {actionError}
        </div>
      )}

      {user?.role === "tutor" && (
        <section className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-brand-yellow">
            <PlusCircle className="size-6" aria-hidden="true" />
            {editingLessonId === null
              ? "Wystaw nowy termin zajęć"
              : "Edytuj termin zajęć"}
          </h2>

          <div className="mb-5 rounded-xl border border-brand-cardBorder bg-brand-black/40 p-4">
            <h3 className="font-semibold text-white">Twoja dostępność</h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              Termin zajęć musi mieścić się w jednym z poniższych okien.
            </p>
            {availabilityError ? (
              <p className="mt-3 text-sm text-red-300" role="alert">
                {availabilityError}
              </p>
            ) : loadingAvailability ? (
              <p className="mt-3 text-sm text-brand-textMuted" role="status">
                Pobieranie dostępności…
              </p>
            ) : availability.length === 0 ? (
              <p className="mt-3 text-sm text-brand-textMuted">
                Nie masz jeszcze zdefiniowanej dostępności. Dodaj ją w
                zakładce „Dostępność”.
              </p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {availability.map((slot) => (
                  <li
                    key={slot.id_availability}
                    className="rounded-lg border border-brand-yellow/30 bg-brand-yellow/10 px-3 py-2 text-sm text-brand-yellow"
                  >
                    {slot.day_of_week}, {slot.start_time}–{slot.end_time}
                  </li>
                ))}
              </ul>
            )}
            {lessonDate && availability.length > 0 && (
              <p className="mt-3 text-sm text-brand-textMuted">
                Dostępność w wybranym dniu (
                {DAYS_BY_NUMBER[
                  new Date(`${lessonDate}T00:00:00.000Z`).getUTCDay()
                ]}
                ):{" "}
                {availability
                  .filter(
                    (slot) =>
                      slot.day_of_week ===
                      DAYS_BY_NUMBER[
                        new Date(`${lessonDate}T00:00:00.000Z`).getUTCDay()
                      ],
                  )
                  .map((slot) => `${slot.start_time}–${slot.end_time}`)
                  .join(", ") || "brak dostępnych godzin"}
              </p>
            )}
          </div>

          {subjectError && (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {subjectError}
            </p>
          )}
          {studentError && (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {studentError}
            </p>
          )}

          <form
            onSubmit={handleCreateLesson}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <div>
              <label
                htmlFor="lesson-subject"
                className="mb-1 block text-xs font-medium text-brand-textMuted"
              >
                Przedmiot
              </label>
              <select
                id="lesson-subject"
                value={selectedSubject}
                onChange={(event) => setSelectedSubject(event.target.value)}
                required
                disabled={loadingSubjects || subjects.length === 0}
                className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-yellow disabled:opacity-60"
              >
                {subjects.length === 0 ? (
                  <option value="">
                    {loadingSubjects
                      ? "Pobieranie oferty…"
                      : "Najpierw dodaj przedmiot do oferty"}
                  </option>
                ) : (
                  subjects.map((offer) => (
                    <option
                      key={offer.id_tutor_subjects}
                      value={offer.subject.id_subjects}
                    >
                      {offer.subject.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="lesson-date"
                className="mb-1 block text-xs font-medium text-brand-textMuted"
              >
                Data zajęć
              </label>
              <input
                id="lesson-date"
                type="date"
                value={lessonDate}
                onChange={(event) => setLessonDate(event.target.value)}
                min={getTodayDate()}
                required
                className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-yellow"
              />
            </div>

            <div>
              <label
                htmlFor="lesson-student"
                className="mb-1 block text-xs font-medium text-brand-textMuted"
              >
                Przypisz do ucznia (opcjonalnie)
              </label>
              <select
                id="lesson-student"
                value={selectedStudent}
                onChange={(event) => setSelectedStudent(event.target.value)}
                disabled={
                  editingLessonId !== null ||
                  loadingStudents ||
                  students.length === 0
                }
                className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-yellow disabled:opacity-60"
              >
                <option value="">
                  {loadingStudents
                    ? "Pobieranie uczniów…"
                    : students.length === 0
                      ? "Brak uczniów do przypisania"
                      : "Wolny termin dla wszystkich"}
                </option>
                {students.map((student) => (
                  <option key={student.id_users} value={student.id_users}>
                    {student.first_name} {student.last_name}
                  </option>
                ))}
              </select>
              {selectedStudent && (
                <p className="mt-1 text-xs text-brand-textMuted">
                  Lekcja będzie zarezerwowana wyłącznie dla wybranego ucznia.
                </p>
              )}
            </div>

            <fieldset>
              <legend className="mb-1 block text-xs font-medium text-brand-textMuted">
                Godzina (od–do)
              </legend>
              <div className="flex gap-2">
                <input
                  type="time"
                  aria-label="Godzina rozpoczęcia"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                  className="w-1/2 rounded-lg border border-brand-cardBorder bg-brand-black px-2 py-2 text-center text-sm text-white outline-none focus:border-brand-yellow"
                />
                <input
                  type="time"
                  aria-label="Godzina zakończenia"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  min={startTime}
                  required
                  className="w-1/2 rounded-lg border border-brand-cardBorder bg-brand-black px-2 py-2 text-center text-sm text-white outline-none focus:border-brand-yellow"
                />
              </div>
            </fieldset>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingSubjects ||
                  subjects.length === 0 ||
                  !selectedSubject
                }
                className="w-full rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Zapisywanie…"
                  : editingLessonId === null
                    ? "Dodaj wolny termin"
                    : "Zapisz zmiany"}
              </button>
            </div>
            {editingLessonId !== null && (
              <button
                type="button"
                onClick={() => {
                  setEditingLessonId(null);
                  setLessonDate("");
                }}
                disabled={submitting}
                className="rounded-lg border border-brand-cardBorder px-4 py-2 text-sm text-white sm:col-span-2 md:col-span-4"
              >
                Anuluj edycję
              </button>
            )}
          </form>
        </section>
      )}

      <section aria-labelledby="available-lessons-heading">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="available-lessons-heading" className="text-xl font-bold">
              Dostępne lekcje w systemie
            </h2>
            <p className="mt-1 text-sm text-brand-textMuted">
              Wolne terminy prowadzone przez korepetytorów.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadLessons()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Odśwież
          </button>
        </div>

        {error && (
          <div
            className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <section
          aria-label="Kalendarz dostępnych lekcji"
          className="mb-6 rounded-2xl border border-brand-cardBorder bg-brand-card p-4 sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
              aria-label="Poprzedni miesiąc"
              className="rounded-lg border border-brand-cardBorder p-2 text-brand-textMuted hover:border-brand-yellow hover:text-brand-yellow"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <h3 className="font-semibold capitalize">
              {calendarMonth.toLocaleDateString("pl-PL", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button
              type="button"
              onClick={() =>
                setCalendarMonth(
                  (current) =>
                    new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
              aria-label="Następny miesiąc"
              className="rounded-lg border border-brand-cardBorder p-2 text-brand-textMuted hover:border-brand-yellow hover:text-brand-yellow"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((day) => (
              <span key={day} className="py-2 font-semibold text-brand-textMuted">
                {day}
              </span>
            ))}
            {calendarDates.map((date) => {
              const key = dateKey(date);
              const isCurrentMonth =
                date.getMonth() === calendarMonth.getMonth();
              const count = availableByDate.get(key) ?? 0;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={!isCurrentMonth}
                  aria-label={`${date.toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}${count ? `, ${count} dostępnych lekcji` : ""}`}
                  aria-pressed={selectedAvailableDate === key}
                  onClick={() =>
                    setSelectedAvailableDate((current) =>
                      current === key ? "" : key,
                    )
                  }
                  className={`relative mx-auto grid size-9 place-items-center rounded-lg text-sm transition sm:size-10 ${
                    selectedAvailableDate === key
                      ? "bg-brand-yellow font-bold text-brand-black"
                      : count
                        ? "bg-brand-yellow/10 text-brand-yellow hover:bg-brand-yellow/20"
                        : "text-white hover:bg-white/5"
                  } disabled:cursor-default disabled:text-white/20`}
                >
                  {date.getDate()}
                  {count > 0 && selectedAvailableDate !== key && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 size-1 rounded-full bg-brand-yellow"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-brand-textMuted">
            <span>Wybierz dzień, aby zobaczyć dostępne terminy.</span>
            {selectedAvailableDate && (
              <button
                type="button"
                onClick={() => setSelectedAvailableDate("")}
                className="font-semibold text-brand-yellow underline-offset-2 hover:underline"
              >
                Pokaż wszystkie dni
              </button>
            )}
          </div>
        </section>

        {loading ? (
          <div
            role="status"
            aria-label="Ładowanie dostępnych terminów"
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-52 animate-pulse rounded-2xl border border-brand-cardBorder bg-brand-card"
              />
            ))}
          </div>
        ) : !error && lessons.length === 0 ? (
          <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-center text-brand-textMuted">
            Brak dostępnych wolnych terminów w tym momencie.
          </p>
        ) : !error && visibleLessons.length === 0 ? (
          <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-center text-brand-textMuted">
            Brak dostępnych terminów w wybranym dniu.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleLessons.map((lesson) => (
              <article
                key={lesson.id_lessons}
                className="space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 transition hover:border-brand-yellow/50"
              >
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <BookOpen
                      className="size-5 text-brand-yellow"
                      aria-hidden="true"
                    />
                    {lesson.subject.name}
                  </h3>
                  <p className="mt-1 text-xs text-brand-textMuted">
                    Korepetytor: {lesson.tutor.first_name}{" "}
                    {lesson.tutor.last_name}
                  </p>
                </div>

                <div className="space-y-2 text-sm text-brand-textMuted">
                  <p className="flex items-center gap-2">
                    <CalendarDays
                      className="size-4 text-brand-yellow"
                      aria-hidden="true"
                    />
                    {formatDate(lesson.lesson_date)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock3
                      className="size-4 text-brand-yellow"
                      aria-hidden="true"
                    />
                    {lesson.start_time}–{lesson.end_time}
                  </p>
                </div>

                {user?.role === "student" && (
                  <button
                    type="button"
                    onClick={() => void handleBook(lesson.id_lessons)}
                    disabled={bookingLessonId !== null}
                    className="mt-2 w-full rounded-lg bg-brand-yellow py-2 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:cursor-wait disabled:opacity-60"
                  >
                    {bookingLessonId === lesson.id_lessons
                      ? "Rezerwowanie…"
                      : "Zarezerwuj"}
                  </button>
                )}
                {user?.role === "tutor" &&
                  lesson.tutor.id_users === user.id && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(lesson)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-white transition hover:border-brand-yellow"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Edytuj
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteLesson(lesson)}
                        disabled={deletingLessonId === lesson.id_lessons}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Usuń
                      </button>
                    </div>
                  )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
