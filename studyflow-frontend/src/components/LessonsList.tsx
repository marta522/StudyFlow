import axios from "axios";
import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  Clock3,
  Pencil,
  PlusCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";

interface Subject {
  id_subjects: number;
  name: string;
  description?: string | null;
}

interface TutorSubjectOffer {
  id_tutor_subjects: number;
  subject: Subject;
}

interface Lesson {
  id_lessons: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  subject: Subject;
  tutor: {
    id_users: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ApiError {
  message?: string | string[];
}

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

export function LessonsList() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [subjects, setSubjects] = useState<TutorSubjectOffer[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingLessonId, setBookingLessonId] = useState<number | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchLessons = useCallback(async () => {
    const { data } = await api.get<Lesson[]>("/bookings/available");
    return data;
  }, []);

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
    void api
      .get<TutorSubjectOffer[]>("/subjects/my-offer")
      .then(({ data }) => {
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
  }, [user?.role]);

  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  async function handleBook(lessonId: number) {
    setBookingLessonId(lessonId);
    setActionError(null);
    setNotice(null);
    try {
      await api.post("/bookings/book", { lesson_id: lessonId });
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
    setSubmitting(true);
    setActionError(null);
    setNotice(null);
    try {
      const lessonData = {
        subject_id: Number(selectedSubject),
        lesson_date: lessonDate,
        start_time: startTime,
        end_time: endTime,
      };
      if (editingLessonId === null) {
        await api.post("/bookings/lessons", lessonData);
        setNotice("Dodano nowy termin zajęć!");
      } else {
        await api.patch(`/bookings/lessons/${editingLessonId}`, lessonData);
        setNotice("Zaktualizowano termin zajęć.");
        setEditingLessonId(null);
      }
      setLessonDate("");
      await loadLessons();
    } catch (requestError: unknown) {
      setActionError(
        getApiError(requestError, "Nie udało się dodać terminu zajęć."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  function beginEdit(lesson: Lesson) {
    setEditingLessonId(lesson.id_lessons);
    setSelectedSubject(String(lesson.subject.id_subjects));
    setLessonDate(lesson.lesson_date.slice(0, 10));
    setStartTime(lesson.start_time);
    setEndTime(lesson.end_time);
    setActionError(null);
    setNotice(null);
  }

  async function deleteLesson(lesson: Lesson) {
    if (
      !window.confirm(
        `Czy usunąć wolny termin ${lesson.subject.name} z ${lesson.lesson_date.slice(0, 10)}?`,
      )
    ) {
      return;
    }
    setDeletingLessonId(lesson.id_lessons);
    setActionError(null);
    setNotice(null);
    try {
      await api.delete(`/bookings/lessons/${lesson.id_lessons}`);
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

          {subjectError && (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {subjectError}
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

        {loading ? (
          <p role="status" className="py-8 text-center text-brand-textMuted">
            Ładowanie terminów…
          </p>
        ) : !error && lessons.length === 0 ? (
          <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-center text-brand-textMuted">
            Brak dostępnych wolnych terminów w tym momencie.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {lessons.map((lesson) => (
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
