import axios from "axios";
import {
  CalendarDays,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";

interface Subject {
  id_subjects: number;
  name: string;
}

interface ScheduleLesson {
  id_lessons: number;
  tutor_id: number;
  subject_id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  subject: Subject;
  tutor: { first_name: string; last_name: string };
  bookings: {
    status: string;
    student: { id_users: number; first_name: string; last_name: string };
  }[];
}

interface ManagedUser {
  id_users: number;
  first_name: string;
  last_name: string;
  email: string;
  role: { name: "student" | "tutor" };
}

interface ManagedSubject extends Subject {
  tutor_subjects: { tutor_id: number }[];
}

interface LessonForm {
  tutor_id: string;
  student_id: string;
  subject_id: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
}

const EMPTY_FORM: LessonForm = {
  tutor_id: "",
  student_id: "",
  subject_id: "",
  lesson_date: "",
  start_time: "14:00",
  end_time: "15:00",
};

interface ApiError {
  message?: string | string[];
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) return "Nie można połączyć się z serwerem.";
  }
  return "Nie udało się pobrać harmonogramu.";
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

export function AdminSchedule() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [offeredSubjects, setOfferedSubjects] = useState<ManagedSubject[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [lessons, setLessons] = useState<ScheduleLesson[]>([]);
  const [lessonForm, setLessonForm] = useState<LessonForm>(EMPTY_FORM);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function searchLessons(params: Record<string, string> = {}) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ScheduleLesson[]>("/bookings/schedule", {
        params,
      });
      setLessons(data);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<Subject[]>("/subjects"),
      api.get<ScheduleLesson[]>("/bookings/schedule"),
      api.get<ManagedSubject[]>("/subjects/admin"),
      api.get<ManagedUser[]>("/users"),
    ])
      .then(
        ([
          subjectResponse,
          lessonResponse,
          managedSubjectResponse,
          userResponse,
        ]) => {
          if (cancelled) return;
          setSubjects(subjectResponse.data);
          setLessons(lessonResponse.data);
          setOfferedSubjects(managedSubjectResponse.data);
          setUsers(userResponse.data);
        },
      )
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (subjectId) params.subject_id = subjectId;
    if (userSearch.trim()) params.user = userSearch.trim();
    void searchLessons(params);
  }

  async function handleSaveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingLesson(true);
    setError(null);
    try {
      const payload = {
        tutor_id: Number(lessonForm.tutor_id),
        subject_id: Number(lessonForm.subject_id),
        lesson_date: lessonForm.lesson_date,
        start_time: lessonForm.start_time,
        end_time: lessonForm.end_time,
        ...(lessonForm.student_id && {
          student_id: Number(lessonForm.student_id),
        }),
      };
      if (editingLessonId) {
        await api.patch(`/bookings/admin/lessons/${editingLessonId}`, payload);
      } else {
        await api.post("/bookings/admin/lessons", payload);
      }
      setLessonForm(EMPTY_FORM);
      setEditingLessonId(null);
      await searchLessons();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSavingLesson(false);
    }
  }

  function startEditing(lesson: ScheduleLesson) {
    setEditingLessonId(lesson.id_lessons);
    setLessonForm({
      tutor_id: String(lesson.tutor_id),
      student_id: "",
      subject_id: String(lesson.subject_id),
      lesson_date: lesson.lesson_date.slice(0, 10),
      start_time: lesson.start_time,
      end_time: lesson.end_time,
    });
  }

  async function cancelLesson(lessonId: number) {
    if (!window.confirm("Anulować tę lekcję i powiązane rezerwacje?")) return;
    setError(null);
    try {
      await api.delete(`/bookings/admin/lessons/${lessonId}`);
      await searchLessons();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="admin-schedule-title">
      <header>
        <h2
          id="admin-schedule-title"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <CalendarDays
            className="size-6 text-brand-yellow"
            aria-hidden="true"
          />
          Harmonogram wszystkich zajęć
        </h2>
        <p className="mt-1 text-sm text-brand-textMuted">
          Zaplanowane, zrealizowane i wolne terminy w systemie.
        </p>
      </header>

      <form
        onSubmit={(event) => void handleSaveLesson(event)}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <h3 className="text-lg font-semibold sm:col-span-2 xl:col-span-4">
          {editingLessonId ? "Edytuj wolny termin" : "Dodaj termin lekcji"}
        </h3>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Korepetytor
          <select
            required
            value={lessonForm.tutor_id}
            onChange={(event) =>
              setLessonForm((form) => ({
                ...form,
                tutor_id: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="">Wybierz korepetytora</option>
            {users
              .filter((user) => user.role.name === "tutor")
              .map((tutor) => (
                <option key={tutor.id_users} value={tutor.id_users}>
                  {tutor.first_name} {tutor.last_name}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Przedmiot
          <select
            required
            value={lessonForm.subject_id}
            onChange={(event) =>
              setLessonForm((form) => ({
                ...form,
                subject_id: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="">Wybierz przedmiot</option>
            {offeredSubjects
              .filter((subject) =>
                subject.tutor_subjects.some(
                  (offer) => String(offer.tutor_id) === lessonForm.tutor_id,
                ),
              )
              .map((subject) => (
                <option key={subject.id_subjects} value={subject.id_subjects}>
                  {subject.name}
                </option>
              ))}
          </select>
        </label>
        {!editingLessonId && (
          <label className="space-y-2 text-sm text-brand-textMuted">
            Uczeń (opcjonalnie)
            <select
              value={lessonForm.student_id}
              onChange={(event) =>
                setLessonForm((form) => ({
                  ...form,
                  student_id: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
            >
              <option value="">Pozostaw termin wolny</option>
              {users
                .filter((user) => user.role.name === "student")
                .map((student) => (
                  <option key={student.id_users} value={student.id_users}>
                    {student.first_name} {student.last_name} ({student.email})
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="space-y-2 text-sm text-brand-textMuted">
          Data
          <input
            required
            type="date"
            value={lessonForm.lesson_date}
            onChange={(event) =>
              setLessonForm((form) => ({
                ...form,
                lesson_date: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Od
          <input
            required
            type="time"
            value={lessonForm.start_time}
            onChange={(event) =>
              setLessonForm((form) => ({
                ...form,
                start_time: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Do
          <input
            required
            type="time"
            value={lessonForm.end_time}
            onChange={(event) =>
              setLessonForm((form) => ({
                ...form,
                end_time: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            disabled={savingLesson}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-brand-black disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" />
            {savingLesson
              ? "Zapisywanie…"
              : editingLessonId
                ? "Zapisz"
                : "Dodaj"}
          </button>
          {editingLessonId && (
            <button
              type="button"
              onClick={() => {
                setEditingLessonId(null);
                setLessonForm(EMPTY_FORM);
              }}
              className="rounded-lg border border-brand-cardBorder px-4 py-2.5 text-sm"
            >
              Anuluj edycję
            </button>
          )}
        </div>
      </form>

      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <label className="space-y-2 text-sm text-brand-textMuted">
          Od daty
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Do daty
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Przedmiot
          <select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="">Wszystkie przedmioty</option>
            {subjects.map((subject) => (
              <option key={subject.id_subjects} value={subject.id_subjects}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Uczeń lub korepetytor
          <input
            minLength={2}
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <div className="flex gap-3 sm:col-span-2 xl:col-span-4">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
          >
            <Search className="size-4" aria-hidden="true" />
            Filtruj
          </button>
          <button
            type="button"
            onClick={() => void searchLessons()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-4 py-2.5 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Pokaż wszystkie
          </button>
        </div>
      </form>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-6 text-center text-brand-textMuted">
          Ładowanie harmonogramu…
        </p>
      ) : !error && lessons.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
          Brak zajęć spełniających wybrane kryteria.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-cardBorder bg-brand-card">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-brand-cardBorder bg-brand-black text-xs uppercase text-brand-textMuted">
              <tr>
                <th className="px-5 py-4">Data i godzina</th>
                <th className="px-5 py-4">Przedmiot</th>
                <th className="px-5 py-4">Korepetytor</th>
                <th className="px-5 py-4">Uczeń</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cardBorder">
              {lessons.map((lesson) => (
                <tr key={lesson.id_lessons} className="hover:bg-brand-black/30">
                  <td className="px-5 py-4">
                    <p>{formatDate(lesson.lesson_date)}</p>
                    <p className="mt-1 text-xs text-brand-textMuted">
                      {lesson.start_time}–{lesson.end_time}
                    </p>
                  </td>
                  <td className="px-5 py-4">{lesson.subject.name}</td>
                  <td className="px-5 py-4">
                    {lesson.tutor.first_name} {lesson.tutor.last_name}
                  </td>
                  <td className="px-5 py-4">
                    {lesson.bookings.length > 0
                      ? lesson.bookings
                          .map(
                            ({ student }) =>
                              `${student.first_name} ${student.last_name}`,
                          )
                          .join(", ")
                      : "Wolny termin"}
                  </td>
                  <td className="px-5 py-4">{lesson.status}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={
                          lesson.status !== "SCHEDULED" ||
                          lesson.bookings.length > 0
                        }
                        onClick={() => startEditing(lesson)}
                        aria-label={`Edytuj lekcję ${lesson.id_lessons}`}
                        className="rounded-lg border border-brand-cardBorder p-2 text-brand-yellow disabled:opacity-40"
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={lesson.status === "COMPLETED"}
                        onClick={() => void cancelLesson(lesson.id_lessons)}
                        aria-label={`Anuluj lekcję ${lesson.id_lessons}`}
                        className="rounded-lg border border-brand-cardBorder p-2 text-red-300 disabled:opacity-40"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
