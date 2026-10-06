import axios from "axios";
import { Award, CalendarCheck, Check, RefreshCw, Users, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import api from "../api/axios";

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

interface Booking {
  id_bookings: number;
  status: string;
  student: Person;
  lesson: {
    id_lessons: number;
    lesson_date: string;
    start_time: string;
    end_time: string;
    status: string;
    subject: Subject;
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

export function TutorStudents() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeStudent, setGradeStudent] = useState<Person | null>(null);
  const [attendanceStudent, setAttendanceStudent] = useState<Person | null>(
    null,
  );
  const [gradeSubjectId, setGradeSubjectId] = useState("");
  const [grade, setGrade] = useState("5");
  const [comment, setComment] = useState("");
  const [attendanceBookingId, setAttendanceBookingId] = useState("");
  const [present, setPresent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    const { data } = await api.get<Booking[]>("/bookings/my-bookings");
    setBookings(data.filter((booking) => booking.status !== "CANCELLED"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<Booking[]>("/bookings/my-bookings")
      .then(({ data }) => {
        if (!cancelled) {
          setBookings(data.filter((booking) => booking.status !== "CANCELLED"));
        }
      })
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

  const gradeBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          gradeStudent?.id_users === booking.student.id_users &&
          booking.lesson.status === "COMPLETED",
      ),
    [bookings, gradeStudent],
  );
  const gradeSubjects = useMemo(() => {
    const uniqueSubjects = new Map<number, Subject>();
    gradeBookings.forEach((booking) =>
      uniqueSubjects.set(
        booking.lesson.subject.id_subjects,
        booking.lesson.subject,
      ),
    );
    return [...uniqueSubjects.values()];
  }, [gradeBookings]);
  const attendanceBookings = useMemo(
    () =>
      bookings.filter(
        (booking) =>
          attendanceStudent?.id_users === booking.student.id_users &&
          bookingHasEnded(booking),
      ),
    [attendanceStudent, bookings],
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await loadBookings();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleAddGrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gradeStudent) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const now = new Date();
      await api.post("/grades", {
        student_id: gradeStudent.id_users,
        subject_id: Number(gradeSubjectId),
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        grade: Number(grade),
        comment: comment.trim() || undefined,
      });
      setNotice(
        `Dodano ocenę dla ${gradeStudent.first_name} ${gradeStudent.last_name}.`,
      );
      setGradeStudent(null);
      setComment("");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
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
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
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
      {loading ? (
        <p role="status" className="py-8 text-center text-brand-textMuted">
          Ładowanie uczniów…
        </p>
      ) : students.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-center text-brand-textMuted">
          Nie masz jeszcze uczniów z aktywną rezerwacją.
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
              {students.map((student) => {
                const studentBookings = bookings.filter(
                  (booking) => booking.student.id_users === student.id_users,
                );
                const hasCompletedLesson = studentBookings.some(
                  (booking) => booking.lesson.status === "COMPLETED",
                );
                const hasEndedLesson = studentBookings.some(bookingHasEnded);
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
                        onClick={() => {
                          setGradeSubjectId("");
                          setGradeStudent(student);
                        }}
                        disabled={!hasCompletedLesson}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-yellow px-3 py-2 text-xs font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          !hasCompletedLesson
                            ? "Oceny można wystawić po zakończeniu lekcji."
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
                        disabled={!hasEndedLesson}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-xs font-semibold text-white transition hover:border-brand-yellow disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          !hasEndedLesson
                            ? "Brak zakończonych lekcji do rozliczenia."
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
                Przedmiot
                <select
                  required
                  value={gradeSubjectId}
                  onChange={(event) => setGradeSubjectId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                >
                  <option value="">Wybierz przedmiot</option>
                  {gradeSubjects.map((subject) => (
                    <option
                      key={subject.id_subjects}
                      value={subject.id_subjects}
                    >
                      {subject.name}
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
                disabled={submitting || !gradeSubjectId}
                className="w-full rounded-lg bg-brand-yellow py-2 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
              >
                {submitting ? "Zapisywanie…" : "Zapisz ocenę"}
              </button>
            </form>
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
