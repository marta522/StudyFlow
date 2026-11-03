import axios from "axios";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";
import { downloadCsv } from "../utils/csv";
import { formatDateLong } from "../utils/date";
import { AdminLessonDetailsDialog } from "./AdminLessonDetailsDialog";

interface Subject {
  id_subjects: number;
  name: string;
}

export interface ScheduleLesson {
  id_lessons: number;
  tutor_id: number;
  subject_id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  cancelled_at: string | null;
  cancelled_by_user: { first_name: string; last_name: string } | null;
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

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mondayForDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}

export function AdminSchedule() {
  const queryClient = useQueryClient();
  const [scheduleParams, setScheduleParams] = useState<Record<string, string>>(
    {},
  );
  const scheduleQuery = useQuery({
    queryKey: ["admin-schedule", "lessons", scheduleParams],
    queryFn: async () => {
      const { data } = await api.get<ScheduleLesson[]>("/bookings/schedule", {
        params: scheduleParams,
      });
      return data;
    },
    staleTime: 30_000,
  });
  const optionsQuery = useQuery({
    queryKey: ["admin-schedule", "options"],
    queryFn: async () => {
      const [subjectResponse, managedSubjectResponse, userResponse] =
        await Promise.all([
          api.get<Subject[]>("/subjects"),
          api.get<ManagedSubject[]>("/subjects/admin"),
          api.get<ManagedUser[]>("/users"),
        ]);
      return {
        subjects: subjectResponse.data,
        offeredSubjects: managedSubjectResponse.data,
        users: userResponse.data,
      };
    },
    staleTime: 30_000,
  });
  const subjects = optionsQuery.data?.subjects ?? [];
  const offeredSubjects = optionsQuery.data?.offeredSubjects ?? [];
  const users = optionsQuery.data?.users ?? [];
  const lessons = scheduleQuery.data ?? [];
  const [lessonForm, setLessonForm] = useState<LessonForm>(EMPTY_FORM);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const [savingLesson, setSavingLesson] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [tutorId, setTutorId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState("");
  const [scheduleView, setScheduleView] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
  });
  const [todayKey] = useState(() => dateKey(new Date()));
  const [selectedLesson, setSelectedLesson] = useState<ScheduleLesson | null>(
    null,
  );
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const loading = scheduleQuery.isFetching || optionsQuery.isFetching;
  const queryError = scheduleQuery.error ?? optionsQuery.error;
  const error = searchError ?? (queryError ? getErrorMessage(queryError) : null);
  const filteredLessons = lessons.filter(
    (lesson) => !statusFilter || lesson.status === statusFilter,
  );
  const sortedLessons = [...filteredLessons].sort((left, right) => {
    const dateComparison =
      left.lesson_date.localeCompare(right.lesson_date) ||
      left.start_time.localeCompare(right.start_time);
    return sortOrder === "asc" ? dateComparison : -dateComparison;
  });
  const conflictingLessonIds = new Set<number>();
  for (let leftIndex = 0; leftIndex < sortedLessons.length; leftIndex += 1) {
    const left = sortedLessons[leftIndex];
    if (left.status !== "SCHEDULED") continue;
    for (let rightIndex = leftIndex + 1; rightIndex < sortedLessons.length; rightIndex += 1) {
      const right = sortedLessons[rightIndex];
      if (right.status !== "SCHEDULED") continue;
      if (left.lesson_date.slice(0, 10) !== right.lesson_date.slice(0, 10)) continue;
      const overlaps =
        left.start_time < right.end_time && right.start_time < left.end_time;
      if (!overlaps) continue;
      const sharedStudent = left.bookings.some(
        (leftBooking) =>
          leftBooking.status !== "CANCELLED" &&
          right.bookings.some(
            (rightBooking) =>
              rightBooking.status !== "CANCELLED" &&
              rightBooking.student.id_users === leftBooking.student.id_users,
          ),
      );
      if (left.tutor_id === right.tutor_id || sharedStudent) {
        conflictingLessonIds.add(left.id_lessons);
        conflictingLessonIds.add(right.id_lessons);
      }
    }
  }
  const isDialogOpen = selectedLesson !== null;

  function openLessonDetails(lesson: ScheduleLesson) {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelectedLesson(lesson);
  }

  function closeLessonDetails() {
    setSelectedLesson(null);
  }

  useEffect(() => {
    if (!isDialogOpen) return;
    const previousFocus = previousFocusRef.current;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedLesson(null);
    };
    document.addEventListener("keydown", handleEscape);
    dialogTitleRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleEscape);
      previousFocus?.focus();
    };
  }, [isDialogOpen]);

  async function searchLessons(
    params: Record<string, string> = {},
    includeStatus = true,
  ) {
    const nextParams = {
      ...params,
      ...(includeStatus && statusFilter && { status: statusFilter }),
    };
    setScheduleParams(nextParams);
    setSearchError(null);
    try {
      await queryClient.fetchQuery({
        queryKey: ["admin-schedule", "lessons", nextParams],
        queryFn: async () => {
          const { data } = await api.get<ScheduleLesson[]>(
            "/bookings/schedule",
            { params: nextParams },
          );
          return data;
        },
        staleTime: 30_000,
      });
    } catch (requestError: unknown) {
      setSearchError(getErrorMessage(requestError));
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (from && to && from > to) {
      setSearchError("Data początkowa nie może być późniejsza od daty końcowej.");
      return;
    }
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (subjectId) params.subject_id = subjectId;
    if (tutorId) params.tutor_id = tutorId;
    if (studentId) params.student_id = studentId;
    if (userSearch.trim()) params.user = userSearch.trim();
    void searchLessons(params);
  }

  async function handleSaveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lessonForm.start_time >= lessonForm.end_time) {
      setSearchError("Godzina zakończenia musi być późniejsza niż rozpoczęcia.");
      return;
    }
    setSavingLesson(true);
    setSearchError(null);
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
      await queryClient.invalidateQueries({
        queryKey: ["admin-schedule", "lessons"],
      });
      await searchLessons();
    } catch (requestError: unknown) {
      setSearchError(getErrorMessage(requestError));
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
    const lesson = lessons.find((item) => item.id_lessons === lessonId);
    const students = lesson?.bookings
      .filter((booking) => booking.status !== "CANCELLED")
      .map(({ student }) => `${student.first_name} ${student.last_name}`)
      .join(", ");
    const message = students
      ? `Odwołać lekcję ${lesson?.subject.name} dla ${students}?\n\nWszyscy uczniowie i korepetytor otrzymają powiadomienie, a powiązane rezerwacje zostaną anulowane.`
      : `Odwołać wolny termin ${lesson?.subject.name}?\n\nKorepetytor otrzyma powiadomienie.`;
    if (!window.confirm(message)) return;
    setSearchError(null);
    try {
      await api.delete(`/bookings/admin/lessons/${lessonId}`);
      await queryClient.invalidateQueries({
        queryKey: ["admin-schedule", "lessons"],
      });
      await searchLessons();
    } catch (requestError: unknown) {
      setSearchError(getErrorMessage(requestError));
    }
  }

  function exportSchedule() {
    const rows = [
      ["Data", "Od", "Do", "Przedmiot", "Korepetytor", "Uczeń", "Status", "Konflikt"],
      ...sortedLessons.map((lesson) => [
        lesson.lesson_date.slice(0, 10),
        lesson.start_time,
        lesson.end_time,
        lesson.subject.name,
        `${lesson.tutor.first_name} ${lesson.tutor.last_name}`,
        lesson.bookings
          .filter((booking) => booking.status !== "CANCELLED")
          .map(({ student }) => `${student.first_name} ${student.last_name}`)
          .join(", "),
        lesson.status,
        conflictingLessonIds.has(lesson.id_lessons) ? "Tak" : "Nie",
      ]),
    ];
    downloadCsv(`harmonogram-studyflow-${dateKey(new Date())}.csv`, rows);
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
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Do daty
          <input
            type="date"
            value={to}
            min={from || undefined}
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
          Korepetytor
          <select
            value={tutorId}
            onChange={(event) => setTutorId(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="">Wszyscy korepetytorzy</option>
            {users
              .filter((user) => user.role.name === "tutor")
              .map((user) => (
                <option key={user.id_users} value={user.id_users}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Uczeń
          <select
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="">Wszyscy uczniowie</option>
            {users
              .filter((user) => user.role.name === "student")
              .map((user) => (
                <option key={user.id_users} value={user.id_users}>
                  {user.first_name} {user.last_name}
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
        <label className="space-y-2 text-sm text-brand-textMuted">
          Sortowanie po dacie
          <select
            value={sortOrder}
            onChange={(event) =>
              setSortOrder(event.target.value === "desc" ? "desc" : "asc")
            }
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="asc">Od najwcześniejszych</option>
            <option value="desc">Od najpóźniejszych</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Status lekcji
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="">Wszystkie statusy</option>
            <option value="SCHEDULED">Zaplanowana</option>
            <option value="COMPLETED">Zakończona</option>
            <option value="CANCELLED">Odwołana</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScheduleView("list")}
              aria-pressed={scheduleView === "list"}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                scheduleView === "list"
                  ? "border-brand-yellow text-brand-yellow"
                  : "border-brand-cardBorder text-brand-textMuted"
              }`}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setScheduleView("week")}
              aria-pressed={scheduleView === "week"}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                scheduleView === "week"
                  ? "border-brand-yellow text-brand-yellow"
                  : "border-brand-cardBorder text-brand-textMuted"
              }`}
            >
              Tydzień
            </button>
          </div>
          {scheduleView === "week" && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setWeekStart((date) => {
                    const next = new Date(date);
                    next.setDate(next.getDate() - 7);
                    return next;
                  })
                }
                aria-label="Poprzedni tydzień"
                className="rounded-lg border border-brand-cardBorder p-2 text-brand-textMuted hover:border-brand-yellow hover:text-white"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="text-sm text-brand-textMuted">
                {weekStart.toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "short",
                })}{" "}
                –{" "}
                {new Date(
                  weekStart.getFullYear(),
                  weekStart.getMonth(),
                  weekStart.getDate() + 6,
                ).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <label className="sr-only" htmlFor="admin-schedule-week-date">
                Przejdź do tygodnia zawierającego wybraną datę
              </label>
              <input
                id="admin-schedule-week-date"
                type="date"
                value={dateKey(weekStart)}
                onChange={(event) => {
                  const monday = mondayForDate(event.target.value);
                  if (monday) setWeekStart(monday);
                }}
                className="rounded-lg border border-brand-cardBorder bg-brand-black px-2 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const date = new Date();
                  date.setHours(0, 0, 0, 0);
                  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
                  setWeekStart(date);
                }}
                className="rounded-lg border border-brand-cardBorder px-3 py-1.5 text-xs font-medium text-brand-yellow hover:border-brand-yellow"
              >
                Dzisiaj
              </button>
              <button
                type="button"
                onClick={() =>
                  setWeekStart((date) => {
                    const next = new Date(date);
                    next.setDate(next.getDate() + 7);
                    return next;
                  })
                }
                aria-label="Następny tydzień"
                className="rounded-lg border border-brand-cardBorder p-2 text-brand-textMuted hover:border-brand-yellow hover:text-white"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          )}
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
            onClick={exportSchedule}
            disabled={sortedLessons.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-4 py-2.5 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden="true" />
            Eksport CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setSubjectId("");
              setTutorId("");
              setStudentId("");
              setUserSearch("");
              setStatusFilter("");
              void searchLessons({}, false);
            }}
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
      ) : !error && sortedLessons.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
          Brak zajęć spełniających wybrane kryteria.
        </p>
      ) : scheduleView === "week" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {Array.from({ length: 7 }, (_, index) => {
              const day = new Date(weekStart);
              day.setDate(day.getDate() + index);
              const dayKey = dateKey(day);
              const isToday = dayKey === todayKey;
              const dayLessons = sortedLessons.filter(
                (lesson) => lesson.lesson_date.slice(0, 10) === dayKey,
              );
              return (
                <section
                  key={dayKey}
                  aria-label={formatDateLong(dayKey)}
                  aria-current={isToday ? "date" : undefined}
                  className={`min-h-36 rounded-xl border bg-brand-card p-3 ${
                    isToday
                      ? "border-brand-yellow ring-1 ring-brand-yellow/40"
                      : "border-brand-cardBorder"
                  }`}
                >
                  <h3 className="mb-3 text-xs font-semibold capitalize text-brand-yellow">
                    {day.toLocaleDateString("pl-PL", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </h3>
                  <ul className="space-y-2">
                    {dayLessons.map((lesson) => (
                      <li key={lesson.id_lessons}>
                        <button
                          type="button"
                          onClick={() => openLessonDetails(lesson)}
                          className={`w-full rounded-lg border p-2 text-left text-xs ${
                            lesson.status === "CANCELLED"
                              ? "border-red-500/40 bg-red-500/10 text-red-200"
                              : "border-brand-yellow/30 bg-brand-yellow/5 text-white"
                          }`}
                        >
                          {lesson.start_time} {lesson.subject.name}
                          {lesson.status === "CANCELLED" && (
                            <span className="mt-1 block">Odwołana</span>
                          )}
                          {conflictingLessonIds.has(lesson.id_lessons) && (
                            <span className="mt-1 block font-semibold text-red-300">
                              Konflikt terminu
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          {!sortedLessons.some((lesson) => {
            const lessonDate = lesson.lesson_date.slice(0, 10);
            const end = new Date(weekStart);
            end.setDate(end.getDate() + 6);
            const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
            const startKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;
            return lessonDate >= startKey && lessonDate <= endKey;
          }) && (
            <p className="rounded-xl border border-brand-cardBorder bg-brand-card p-4 text-sm text-brand-textMuted">
              Brak lekcji w tym tygodniu.
            </p>
          )}
        </>
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
              {sortedLessons.map((lesson) => (
                <tr
                  key={lesson.id_lessons}
                  className={`hover:bg-brand-black/30 ${
                    lesson.status === "CANCELLED" ? "bg-red-500/5 text-red-200" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => openLessonDetails(lesson)}
                      className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
                    >
                      <p>{formatDateLong(lesson.lesson_date)}</p>
                      <p className="mt-1 text-xs text-brand-textMuted">
                        {lesson.start_time}–{lesson.end_time}
                      </p>
                    </button>
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
                  <td className="px-5 py-4">
                    {lesson.status === "CANCELLED"
                      ? "Odwołana"
                      : lesson.status === "COMPLETED"
                        ? "Zakończona"
                        : "Zaplanowana"}
                    {conflictingLessonIds.has(lesson.id_lessons) && (
                      <span
                        className="ml-2 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-300"
                        title="Nakłada się na inny termin tego korepetytora lub ucznia"
                      >
                        Konflikt
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={lesson.status !== "SCHEDULED"}
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
      <AdminLessonDetailsDialog
        lesson={selectedLesson}
        headingRef={dialogTitleRef}
        onClose={closeLessonDetails}
      />
    </section>
  );
}
