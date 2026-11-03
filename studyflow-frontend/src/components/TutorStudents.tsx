import axios from "axios";
import {
  Award,
  CalendarCheck,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import { useBookings } from "../hooks/useBookings";

interface Person {
  id_users: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
}

interface Subject {
  id_subjects: number;
  name: string;
}

interface GradeRecord {
  id_monthly_grades: number;
  month: number;
  year: number;
  grade: number | string;
  comment: string | null;
  created_at: string;
  lesson: { lesson_date: string } | null;
  subject: Subject;
  tutor: Pick<Person, "first_name" | "last_name">;
}

interface AttendanceRecord {
  id_attendance: number;
  present: boolean;
  marked_at: string;
}

interface Booking {
  id_bookings: number;
  status: string;
  attendance: AttendanceRecord | null;
  student: Person;
  lesson: {
    id_lessons: number;
    lesson_date: string;
    start_time: string;
    end_time: string;
    status: string;
    subject: Subject;
    monthly_grades: { id_monthly_grades: number; student_id: number }[];
  };
}

interface ApiError {
  message?: string | string[];
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) {
      return "Nie można połączyć się z serwerem. Sprawdź, czy backend działa.";
    }
  }
  return "Nie udało się wykonać operacji.";
}

function bookingHasEnded(booking: Booking): boolean {
  const date = booking.lesson.lesson_date.slice(0, 10);
  return (
    new Date(`${date}T${booking.lesson.end_time}:00Z`).getTime() <= Date.now()
  );
}

function getNextWeekRange() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const daysUntilNextMonday = start.getUTCDay() === 0 ? 1 : 8 - start.getUTCDay();
  start.setUTCDate(start.getUTCDate() + daysUntilNextMonday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatLessonDate(date: string): string {
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00.000Z`));
}

export function TutorStudents() {
  const { user } = useAuth();
  const bookingsQuery = useBookings<Booking>(user?.id);
  const bookings = (bookingsQuery.data ?? []).filter(
    (booking) => booking.status !== "CANCELLED",
  );
  const { refetch: refetchBookings, error: bookingsError } = bookingsQuery;
  const [refreshing, setRefreshing] = useState(false);
  const loading = bookingsQuery.isPending || refreshing;
  const [error, setError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [gradeStudent, setGradeStudent] = useState<Person | null>(null);
  const [gradesStudent, setGradesStudent] = useState<Person | null>(null);
  const [studentGrades, setStudentGrades] = useState<GradeRecord[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [gradeHistoryError, setGradeHistoryError] = useState<string | null>(
    null,
  );
  const [attendanceHistoryDate, setAttendanceHistoryDate] = useState("");
  const [gradeHistoryDate, setGradeHistoryDate] = useState("");
  const [attendanceStudent, setAttendanceStudent] = useState<Person | null>(
    null,
  );
  const [gradeLessonId, setGradeLessonId] = useState("");
  const [grade, setGrade] = useState("5");
  const [comment, setComment] = useState("");
  const [attendanceBookingId, setAttendanceBookingId] = useState("");
  const [present, setPresent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    await refetchBookings({ throwOnError: true });
  }, [refetchBookings]);
  const displayError =
    error ??
    (bookingsError ? getErrorMessage(bookingsError) : null);

  const students = useMemo(() => {
    const byId = new Map<number, Person>();
    bookings.forEach((booking) =>
      byId.set(booking.student.id_users, booking.student),
    );
    return [...byId.values()].sort((left, right) =>
      `${left.last_name} ${left.first_name}`.localeCompare(
        `${right.last_name} ${right.first_name}`,
        "pl",
      ),
    );
  }, [bookings]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLocaleLowerCase("pl");
    if (!query) return students;
    return students.filter((student) =>
      `${student.first_name} ${student.last_name} ${student.email}`
        .toLocaleLowerCase("pl")
        .includes(query),
    );
  }, [studentSearch, students]);

  const gradeBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          gradeStudent?.id_users === booking.student.id_users &&
          bookingHasEnded(booking) &&
          !booking.lesson.monthly_grades.some(
            (gradeRecord) => gradeRecord.student_id === booking.student.id_users,
          ),
      ),
    [bookings, gradeStudent],
  );
  const attendanceBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          attendanceStudent?.id_users === booking.student.id_users &&
          bookingHasEnded(booking) &&
          booking.attendance === null,
      ),
    [attendanceStudent, bookings],
  );
  const nextWeekBookings = useMemo(() => {
    const { start, end } = getNextWeekRange();
    return bookings.filter((booking) => {
      const lessonDate = booking.lesson.lesson_date.slice(0, 10);
      return (
        lessonDate >= start &&
        lessonDate < end &&
        booking.lesson.status === "SCHEDULED"
      );
    });
  }, [bookings]);
  const historyBookings = useMemo(
    () =>
      bookings
        .filter(
          (booking) => booking.student.id_users === gradesStudent?.id_users,
        )
        .sort((left, right) =>
          right.lesson.lesson_date.localeCompare(left.lesson.lesson_date),
        ),
    [bookings, gradesStudent],
  );
  const filteredAttendanceHistory = useMemo(
    () =>
      historyBookings.filter(
        (booking) =>
          !attendanceHistoryDate ||
          booking.lesson.lesson_date.slice(0, 10) === attendanceHistoryDate,
      ),
    [attendanceHistoryDate, historyBookings],
  );
  const filteredGradeHistory = useMemo(
    () =>
      studentGrades.filter((record) => {
        if (!gradeHistoryDate) return true;
        const recordDate = record.lesson?.lesson_date ?? record.created_at;
        return recordDate.slice(0, 10) === gradeHistoryDate;
      }),
    [gradeHistoryDate, studentGrades],
  );

  async function refresh() {
    setRefreshing(true);
    setError(null);
    try {
      await loadBookings();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleAddGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradeStudent || !gradeLessonId) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/grades", {
        lesson_id: Number(gradeLessonId),
        grade: Number(grade),
        comment: comment.trim() || undefined,
      });
      setNotice(
        `Dodano ocenę dla ${gradeStudent.first_name} ${gradeStudent.last_name}.`,
      );
      setGradeStudent(null);
      setComment("");
      await loadBookings();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewGrades(student: Person) {
    setGradesStudent(student);
    setAttendanceHistoryDate("");
    setGradeHistoryDate("");
    setStudentGrades([]);
    setGradeHistoryError(null);
    setLoadingGrades(true);
    try {
      const { data } = await api.get<GradeRecord[]>(
        `/grades/student/${student.id_users}`,
      );
      setStudentGrades(data);
    } catch (requestError: unknown) {
      setGradeHistoryError(getErrorMessage(requestError));
    } finally {
      setLoadingGrades(false);
    }
  }

  async function handleMarkAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attendanceStudent) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/attendance", {
        booking_id: Number(attendanceBookingId),
        present,
      });
      setNotice(`Zapisano obecność ucznia ${attendanceStudent.first_name}.`);
      setAttendanceStudent(null);
      await loadBookings();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="tutor-students-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="tutor-students-heading"
          className="flex items-center gap-2 text-xl font-bold text-brand-yellow"
        >
          <Users className="size-6" aria-hidden="true" />
          Moi uczniowie
        </h2>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Odśwież
        </button>
      </div>
      {displayError && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {displayError}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300"
        >
          {notice}
        </p>
      )}
      {!loading && (
        <section
          className="space-y-4"
          aria-labelledby="next-week-lessons-heading"
        >
          <div>
            <h3
              id="next-week-lessons-heading"
              className="text-lg font-bold text-white"
            >
              Lekcje w przyszłym tygodniu
            </h3>
            <p className="mt-1 text-sm text-brand-textMuted">
              Obecność na tych zajęciach będzie można oznaczyć po ich
              zakończeniu.
            </p>
          </div>
          {nextWeekBookings.length === 0 ? (
            <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-5 text-brand-textMuted">
              Nie masz zaplanowanych lekcji na przyszły tydzień.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {nextWeekBookings.map((booking) => (
                <li
                  key={booking.id_bookings}
                  className="rounded-2xl border border-brand-cardBorder bg-brand-card p-5"
                >
                  <p className="font-semibold text-white">
                    {booking.student.first_name} {booking.student.last_name}
                    <span className="font-normal text-brand-textMuted">
                      {" "}
                      · {booking.lesson.subject.name}
                    </span>
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-brand-textMuted">
                    <CalendarDays
                      className="size-4 text-brand-yellow"
                      aria-hidden="true"
                    />
                    {formatLessonDate(booking.lesson.lesson_date)}
                    <Clock3
                      className="ml-2 size-4 text-brand-yellow"
                      aria-hidden="true"
                    />
                    {booking.lesson.start_time}–{booking.lesson.end_time}
                  </p>
                  <p className="mt-3 text-xs text-brand-yellow">
                    Oznacz obecność po zakończeniu lekcji w sekcji „Moi
                    uczniowie”.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {loading ? (
        <p role="status" className="py-8 text-center text-brand-textMuted">
          Ładowanie uczniów…
        </p>
      ) : students.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-center text-brand-textMuted">
          Nie masz jeszcze uczniów z aktywną rezerwacją.
        </p>
      ) : (
        <div className="space-y-4">
          <label className="relative block max-w-lg">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-textMuted"
              aria-hidden="true"
            />
            <span className="sr-only">Szukaj ucznia</span>
            <input
              type="search"
              value={studentSearch}
              onChange={(event) => setStudentSearch(event.target.value)}
              placeholder="Szukaj ucznia po imieniu, nazwisku lub emailu"
              className="w-full rounded-xl border border-brand-cardBorder bg-brand-card py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-brand-textMuted focus:border-brand-yellow"
            />
          </label>
          {filteredStudents.length === 0 ? (
            <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-center text-brand-textMuted">
              Nie znaleziono ucznia pasującego do wyszukiwania.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-cardBorder bg-brand-card">
              <table className="w-full text-left text-sm text-white">
            <thead className="border-b border-brand-cardBorder bg-brand-black text-xs uppercase text-brand-textMuted">
              <tr>
                <th className="px-5 py-4">Uczeń</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Telefon</th>
                <th className="px-5 py-4 text-right">Działania</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cardBorder">
              {filteredStudents.map((student) => {
                const studentBookings = bookings.filter(
                  (booking) => booking.student.id_users === student.id_users,
                );
                const hasGradeableLesson = studentBookings.some(
                  (booking) =>
                    bookingHasEnded(booking) &&
                    !booking.lesson.monthly_grades.some(
                      (gradeRecord) =>
                        gradeRecord.student_id === booking.student.id_users,
                    ),
                );
                const hasUnmarkedAttendance = studentBookings.some(
                  (booking) =>
                    bookingHasEnded(booking) && booking.attendance === null,
                );
                return (
                  <tr
                    key={student.id_users}
                    className="hover:bg-brand-black/40"
                  >
                    <td className="px-5 py-4 font-semibold">
                      {student.first_name} {student.last_name}
                    </td>
                    <td className="px-5 py-4 text-brand-textMuted">
                      {student.email}
                    </td>
                    <td className="px-5 py-4 text-brand-textMuted">
                      {student.phone || "Brak"}
                    </td>
                    <td className="space-x-2 px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => void handleViewGrades(student)}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-xs font-semibold text-white transition hover:border-brand-yellow"
                      >
                        <ClipboardList
                          className="size-4 text-brand-yellow"
                          aria-hidden="true"
                        />
                          Historia
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGradeLessonId("");
                          setGradeStudent(student);
                        }}
                        disabled={!hasGradeableLesson}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-yellow px-3 py-2 text-xs font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          !hasGradeableLesson
                            ? "Brak zakończonych lekcji bez wystawionej oceny."
                            : undefined
                        }
                      >
                        <Award className="size-4" aria-hidden="true" />
                        Dodaj ocenę
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceBookingId("");
                          setAttendanceStudent(student);
                        }}
                        disabled={!hasUnmarkedAttendance}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-xs font-semibold text-white transition hover:border-brand-yellow disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          !hasUnmarkedAttendance
                            ? "Brak zakończonych lekcji bez oznaczonej obecności."
                            : undefined
                        }
                      >
                        <CalendarCheck
                          className="size-4 text-brand-yellow"
                          aria-hidden="true"
                        />
                        Obecność
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {gradeStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-grade-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
          >
            <div className="flex items-center justify-between border-b border-brand-cardBorder pb-3">
              <h3 id="add-grade-title" className="font-bold text-brand-yellow">
                Ocena dla: {gradeStudent.first_name} {gradeStudent.last_name}
              </h3>
              <button
                type="button"
                aria-label="Zamknij"
                onClick={() => setGradeStudent(null)}
                className="text-brand-textMuted hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              onSubmit={(event) => void handleAddGrade(event)}
              className="space-y-4"
            >
              <label className="block text-sm text-brand-textMuted">
                Zakończona lekcja bez wystawionej oceny
                <select
                  required
                  value={gradeLessonId}
                  onChange={(event) => setGradeLessonId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                >
                  <option value="">Wybierz lekcję</option>
                  {gradeBookings.map((booking) => (
                    <option
                      key={booking.id_bookings}
                      value={booking.lesson.id_lessons}
                    >
                      {booking.lesson.subject.name} —{" "}
                      {formatLessonDate(booking.lesson.lesson_date)} (
                      {booking.lesson.start_time})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-brand-textMuted">
                Ocena (1–6)
                <input
                  type="number"
                  min={1}
                  max={6}
                  step={0.5}
                  required
                  value={grade}
                  onChange={(event) => setGrade(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-brand-textMuted">
                Komentarz
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || !gradeLessonId}
                className="w-full rounded-lg bg-brand-yellow py-2 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
              >
                {submitting ? "Zapisywanie…" : "Zapisz ocenę"}
              </button>
            </form>
          </section>
        </div>
      )}

      {gradesStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-grades-title"
            className="w-full max-w-2xl space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
          >
            <div className="flex items-center justify-between border-b border-brand-cardBorder pb-3">
              <h3
                id="student-grades-title"
                className="font-bold text-brand-yellow"
              >
                Historia ucznia: {gradesStudent.first_name}{" "}
                {gradesStudent.last_name}
              </h3>
              <button
                type="button"
                aria-label="Zamknij"
                onClick={() => setGradesStudent(null)}
                className="text-brand-textMuted hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-1">
              <section className="space-y-3" aria-labelledby="attendance-history-title">
                <h4 id="attendance-history-title" className="font-semibold text-white">
                  Historia obecności
                </h4>
                <label className="block max-w-xs text-sm text-brand-textMuted">
                  Data lekcji
                  <input
                    type="date"
                    value={attendanceHistoryDate}
                    onChange={(event) =>
                      setAttendanceHistoryDate(event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                  />
                </label>
                {filteredAttendanceHistory.length === 0 ? (
                  <p className="rounded-xl border border-brand-cardBorder p-4 text-sm text-brand-textMuted">
                    {attendanceHistoryDate
                      ? "Brak obecności dla wybranego dnia."
                      : "Brak lekcji w historii tego ucznia."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {filteredAttendanceHistory.map((booking) => (
                      <li
                        key={booking.id_bookings}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-cardBorder p-4"
                      >
                        <div>
                          <p className="font-medium text-white">
                            {booking.lesson.subject.name}
                          </p>
                          <p className="text-sm capitalize text-brand-textMuted">
                            {formatLessonDate(booking.lesson.lesson_date)} ·{" "}
                            {booking.lesson.start_time}–
                            {booking.lesson.end_time}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold ${
                            booking.attendance
                              ? booking.attendance.present
                                ? "text-green-400"
                                : "text-red-400"
                              : "text-brand-textMuted"
                          }`}
                        >
                          {booking.attendance
                            ? booking.attendance.present
                              ? "Obecny"
                              : "Nieobecny"
                            : bookingHasEnded(booking)
                              ? "Nieoznaczona"
                              : "Lekcja jeszcze się nie odbyła"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3" aria-labelledby="grade-history-title">
                <h4 id="grade-history-title" className="font-semibold text-white">
                  Wystawione oceny
                </h4>
                <label className="block max-w-xs text-sm text-brand-textMuted">
                  Data lekcji
                  <input
                    type="date"
                    value={gradeHistoryDate}
                    onChange={(event) => setGradeHistoryDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                  />
                </label>
                {loadingGrades ? (
                  <p role="status" className="py-4 text-center text-brand-textMuted">
                    Ładowanie ocen…
                  </p>
                ) : gradeHistoryError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
                  >
                    {gradeHistoryError}
                  </p>
                ) : filteredGradeHistory.length === 0 ? (
                  <p className="rounded-xl border border-brand-cardBorder p-4 text-sm text-brand-textMuted">
                    {gradeHistoryDate
                      ? "Brak ocen dla wybranego dnia."
                      : "Ten uczeń nie ma jeszcze wystawionych ocen."}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {filteredGradeHistory.map((record) => (
                  <li
                    key={record.id_monthly_grades}
                    className="rounded-xl border border-brand-cardBorder p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">
                          {record.subject.name}
                        </p>
                        <p className="text-sm capitalize text-brand-textMuted">
                          {record.lesson
                            ? `${formatLessonDate(record.lesson.lesson_date)} · `
                            : `${formatLessonDate(record.created_at)} · `}
                          {new Intl.DateTimeFormat("pl-PL", {
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                          }).format(
                            new Date(Date.UTC(record.year, record.month - 1, 1)),
                          )}
                        </p>
                      </div>
                      <span className="rounded-lg bg-brand-yellow/10 px-3 py-1 font-bold text-brand-yellow">
                        Ocena: {record.grade}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-brand-textMuted">
                      Wystawił(a): {record.tutor.first_name}{" "}
                      {record.tutor.last_name}
                    </p>
                    {record.comment && (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-brand-textMuted">
                        {record.comment}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
                )}
              </section>
            </div>
          </section>
        </div>
      )}

      {attendanceStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
          >
            <div className="flex items-center justify-between border-b border-brand-cardBorder pb-3">
              <h3 id="attendance-title" className="font-bold text-brand-yellow">
                Obecność: {attendanceStudent.first_name}{" "}
                {attendanceStudent.last_name}
              </h3>
              <button
                type="button"
                aria-label="Zamknij"
                onClick={() => setAttendanceStudent(null)}
                className="text-brand-textMuted hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            <form
              onSubmit={(event) => void handleMarkAttendance(event)}
              className="space-y-4"
            >
              <label className="block text-sm text-brand-textMuted">
                Zakończona rezerwacja
                <select
                  required
                  value={attendanceBookingId}
                  onChange={(event) =>
                    setAttendanceBookingId(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                >
                  <option value="">Wybierz lekcję</option>
                  {attendanceBookings.map((booking) => (
                    <option
                      key={booking.id_bookings}
                      value={booking.id_bookings}
                    >
                      {booking.lesson.subject.name} —{" "}
                      {booking.lesson.lesson_date.slice(0, 10)} (
                      {booking.lesson.start_time})
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPresent(true)}
                  aria-pressed={present}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 font-semibold ${present ? "border-green-500 bg-green-500 text-black" : "border-brand-cardBorder text-white"}`}
                >
                  <Check className="size-4" /> Obecny
                </button>
                <button
                  type="button"
                  onClick={() => setPresent(false)}
                  aria-pressed={!present}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 font-semibold ${!present ? "border-red-500 bg-red-500 text-white" : "border-brand-cardBorder text-white"}`}
                >
                  <X className="size-4" /> Nieobecny
                </button>
              </div>
              <button
                type="submit"
                disabled={submitting || !attendanceBookingId}
                className="w-full rounded-lg bg-brand-yellow py-2 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
              >
                {submitting ? "Zapisywanie…" : "Zapisz obecność"}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
