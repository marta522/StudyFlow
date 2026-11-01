import axios from "axios";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquareWarning,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";
import { Link } from "react-router-dom";

interface Person {
  first_name: string;
  last_name: string;
  email?: string;
}

interface Booking {
  id_bookings: number;
  booking_date: string;
  status: string;
  note?: string | null;
  cancelled_by_user?: Person | null;
  lesson: {
    id_lessons: number;
    lesson_date: string;
    start_time: string;
    end_time: string;
    status: string;
    homework?: string | null;
    cancelled_at?: string | null;
    cancelled_by_user?: Person | null;
    subject: { name: string };
    tutor?: Person;
  };
  student?: Person;
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
  return "Nie udało się pobrać rezerwacji.";
}

function formatDate(date: string): string {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function lessonHasEnded(booking: Booking): boolean {
  const [hours, minutes] = booking.lesson.end_time.split(":").map(Number);
  const lessonEnd = new Date(
    `${booking.lesson.lesson_date.slice(0, 10)}T00:00:00.000Z`,
  );
  lessonEnd.setUTCHours(hours, minutes, 0, 0);
  return lessonEnd.getTime() <= Date.now();
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonday(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

function mondayForDate(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return getMonday(new Date(year, month - 1, day));
}

export function MyBookings({
  onOpenTutorStudents,
}: {
  onOpenTutorStudents?: () => void;
}) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<"upcoming" | "past">(
    "upcoming",
  );
  const [subjectFilter, setSubjectFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortOrder, setSortOrder] = useState<"default" | "asc" | "desc">(
    "default",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "cancelled"
  >("all");
  const [scheduleView, setScheduleView] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [todayKey] = useState(() => dateKey(new Date()));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [issueFormOpen, setIssueFormOpen] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issueSent, setIssueSent] = useState(false);
  const [sendingIssue, setSendingIssue] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isDialogOpen = selectedBooking !== null;

  const fetchBookings = useCallback(async () => {
    const { data } = await api.get<Booking[]>("/bookings/my-bookings");
    setBookings(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<Booking[]>("/bookings/my-bookings")
      .then(({ data }) => {
        if (!cancelled) setBookings(data);
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

  async function refreshBookings() {
    setLoading(true);
    setError(null);
    try {
      await fetchBookings();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  const heading =
    user?.role === "admin"
      ? "Rezerwacje w systemie"
      : "Harmonogram lekcji";
  const upcomingBookings = bookings
    .filter((booking) => !lessonHasEnded(booking))
    .sort((left, right) =>
      left.lesson.lesson_date.localeCompare(right.lesson.lesson_date) ||
      left.lesson.start_time.localeCompare(right.lesson.start_time),
    );
  const pastBookings = bookings
    .filter(lessonHasEnded)
    .sort((left, right) =>
      right.lesson.lesson_date.localeCompare(left.lesson.lesson_date) ||
      right.lesson.start_time.localeCompare(left.lesson.start_time),
    );
  const selectedBookings =
    selectedPeriod === "upcoming" ? upcomingBookings : pastBookings;
  const displayedBookings = [...selectedBookings]
    .filter((booking) => {
      const lessonDate = booking.lesson.lesson_date.slice(0, 10);
      return (
        (!subjectFilter || booking.lesson.subject.name === subjectFilter) &&
        (!dateFrom || lessonDate >= dateFrom) &&
        (!dateTo || lessonDate <= dateTo) &&
        (statusFilter === "all" ||
          (statusFilter === "cancelled"
            ? booking.status === "CANCELLED" ||
              booking.lesson.status === "CANCELLED"
            : booking.status !== "CANCELLED" &&
              booking.lesson.status !== "CANCELLED"))
      );
    })
    .sort((left, right) => {
      const dateComparison =
        left.lesson.lesson_date.localeCompare(right.lesson.lesson_date) ||
        left.lesson.start_time.localeCompare(right.lesson.start_time);
      const order =
        sortOrder === "default"
          ? selectedPeriod === "upcoming"
            ? "asc"
            : "desc"
          : sortOrder;
      return order === "asc" ? dateComparison : -dateComparison;
    });
  const subjects = [
    ...new Set(bookings.map((booking) => booking.lesson.subject.name)),
  ].sort((left, right) => left.localeCompare(right, "pl"));
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });
  const weekBookings = displayedBookings.filter((booking) => {
    const date = booking.lesson.lesson_date.slice(0, 10);
    return date >= dateKey(weekStart) && date <= dateKey(weekDays[6]);
  });
  const clearFilters = () => {
    setSubjectFilter("");
    setDateFrom("");
    setDateTo("");
    setSortOrder("default");
    setStatusFilter("all");
  };

  function openBookingDetails(booking: Booking) {
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSelectedBooking(booking);
    setIssueFormOpen(false);
    setIssueTitle("");
    setIssueDescription("");
    setIssueError(null);
    setIssueSent(false);
  }

  function closeBookingDetails() {
    setSelectedBooking(null);
  }

  async function submitLessonIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBooking) return;
    setSendingIssue(true);
    setIssueError(null);
    try {
      await api.post("/lesson-issues", {
        lesson_id: selectedBooking.lesson.id_lessons,
        title: issueTitle,
        description: issueDescription,
      });
      setIssueSent(true);
      setIssueFormOpen(false);
    } catch (requestError: unknown) {
      setIssueError(getErrorMessage(requestError));
    } finally {
      setSendingIssue(false);
    }
  }

  useEffect(() => {
    if (!isDialogOpen) return;
    const previousFocus = previousFocusRef.current;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedBooking(null);
    };
    document.addEventListener("keydown", handleEscape);
    dialogTitleRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleEscape);
      previousFocus?.focus();
    };
  }, [isDialogOpen]);

  function renderBookings(items: Booking[]) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((booking) => {
          const otherPerson =
            user?.role === "student" ? booking.lesson.tutor : booking.student;
          const personLabel =
            user?.role === "student" ? "Korepetytor" : "Uczeń";
          const isCancelled =
            booking.status === "CANCELLED" ||
            booking.lesson.status === "CANCELLED";
          const isCompleted = booking.lesson.status === "COMPLETED";

          return (
            <article
              key={booking.id_bookings}
              onClick={() => openBookingDetails(booking)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openBookingDetails(booking);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Szczegóły lekcji ${booking.lesson.subject.name}, ${formatDate(booking.lesson.lesson_date)}`}
              className="space-y-3 rounded-xl border border-brand-cardBorder bg-brand-card p-5 text-left transition hover:border-brand-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                  <BookOpen
                    className="size-5 text-brand-yellow"
                    aria-hidden="true"
                  />
                  {booking.lesson.subject.name}
                </h3>
                <span
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                    isCancelled
                      ? "border-red-500/40 bg-red-500/10 text-red-300"
                      : isCompleted
                        ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                        : "border-green-500/40 bg-green-500/10 text-green-400"
                  }`}
                >
                  <CheckCircle2 className="size-3" aria-hidden="true" />
                  {isCancelled
                    ? "Odwołana"
                    : isCompleted
                      ? "Zakończona"
                      : "Zarezerwowana"}
                </span>
              </div>

              <div className="space-y-2 text-sm text-brand-textMuted">
                <p className="flex items-center gap-2">
                  <Clock3
                    className="size-4 text-brand-yellow"
                    aria-hidden="true"
                  />
                  {formatDate(booking.lesson.lesson_date)} (
                  {booking.lesson.start_time}–{booking.lesson.end_time})
                </p>
                {otherPerson && (
                  <p className="flex items-center gap-2">
                    <UserRound
                      className="size-4 text-brand-yellow"
                      aria-hidden="true"
                    />
                    {personLabel}: {otherPerson.first_name}{" "}
                    {otherPerson.last_name}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="my-bookings-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="my-bookings-title"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <CalendarDays
            className="size-6 text-brand-yellow"
            aria-hidden="true"
          />
          {heading}
        </h2>
        <button
          type="button"
          onClick={() => void refreshBookings()}
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
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div
          role="status"
          aria-label="Ładowanie rezerwacji"
          className="grid gap-4 md:grid-cols-2"
        >
          <span className="sr-only">Ładowanie rezerwacji…</span>
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              aria-hidden="true"
              className="animate-pulse space-y-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-5"
            >
              <div className="h-5 w-2/5 rounded bg-white/10" />
              <div className="h-4 w-3/5 rounded bg-white/10" />
              <div className="h-4 w-1/3 rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : !error && bookings.length === 0 ? (
        <div className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center">
          <CalendarDays
            className="mx-auto size-10 text-brand-yellow"
            aria-hidden="true"
          />
          <p className="mt-3 text-brand-textMuted">
            Brak lekcji w harmonogramie.
          </p>
          {user?.role === "student" && (
            <Link
              to="/tutors"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover"
            >
              <Search className="size-4" aria-hidden="true" />
              Znajdź korepetytora
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Wybierz lekcje do wyświetlenia"
          >
            <button
              type="button"
              onClick={() => setSelectedPeriod("upcoming")}
              aria-pressed={selectedPeriod === "upcoming"}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                selectedPeriod === "upcoming"
                  ? "border-brand-yellow bg-brand-yellow/10 text-brand-yellow"
                  : "border-brand-cardBorder text-brand-textMuted hover:border-brand-yellow hover:text-white"
              }`}
            >
              Nadchodzące ({upcomingBookings.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedPeriod("past")}
              aria-pressed={selectedPeriod === "past"}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                selectedPeriod === "past"
                  ? "border-brand-yellow bg-brand-yellow/10 text-brand-yellow"
                  : "border-brand-cardBorder text-brand-textMuted hover:border-brand-yellow hover:text-white"
              }`}
            >
              Historia ({pastBookings.length})
            </button>
          </div>

          <section
            className="space-y-4"
            aria-labelledby="selected-lessons-heading"
          >
            <h3
              id="selected-lessons-heading"
              className="text-lg font-bold text-white"
            >
              {selectedPeriod === "upcoming"
                ? "Nadchodzące lekcje"
                : "Historia lekcji"}
            </h3>
            <div className="grid gap-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="space-y-1 text-xs text-brand-textMuted">
                Przedmiot
                <select
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
                >
                  <option value="">Wszystkie przedmioty</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs text-brand-textMuted">
                Od daty
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs text-brand-textMuted">
                Do daty
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="space-y-1 text-xs text-brand-textMuted">
                Sortowanie
                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(event.target.value as "default" | "asc" | "desc")
                  }
                  className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
                >
                  <option value="default">Domyślnie</option>
                  <option value="asc">Od najwcześniejszych</option>
                  <option value="desc">Od najpóźniejszych</option>
                </select>
              </label>
              <label className="space-y-1 text-xs text-brand-textMuted">
                Status
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value as "all" | "active" | "cancelled",
                    )
                  }
                  className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
                >
                  <option value="all">Wszystkie</option>
                  <option value="active">Aktywne</option>
                  <option value="cancelled">Odwołane</option>
                </select>
              </label>
              {(subjectFilter ||
                dateFrom ||
                dateTo ||
                sortOrder !== "default" ||
                statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-left text-sm font-medium text-brand-yellow hover:underline sm:col-span-2 lg:col-span-4"
                >
                  Wyczyść filtry i sortowanie
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                className="flex gap-2"
                role="group"
                aria-label="Wybierz widok harmonogramu"
              >
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
                    {weekDays[0].toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    –{" "}
                    {weekDays[6].toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <label className="sr-only" htmlFor="schedule-week-date">
                    Przejdź do tygodnia zawierającego wybraną datę
                  </label>
                  <input
                    id="schedule-week-date"
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
                    onClick={() => setWeekStart(getMonday(new Date()))}
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
            </div>
            {scheduleView === "week" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                  {weekDays.map((day) => {
                    const dayKey = dateKey(day);
                    const dayBookings = weekBookings.filter(
                      (booking) =>
                        booking.lesson.lesson_date.slice(0, 10) === dayKey,
                    );
                    return (
                      <section
                        key={dayKey}
                        aria-current={
                          dayKey === todayKey ? "date" : undefined
                        }
                        aria-label={day.toLocaleDateString("pl-PL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                        className={`min-h-36 rounded-xl border bg-brand-card p-3 ${
                          dayKey === todayKey
                            ? "border-brand-yellow ring-1 ring-brand-yellow/40"
                            : "border-brand-cardBorder"
                        }`}
                      >
                        <h4 className="mb-3 text-xs font-semibold capitalize text-brand-yellow">
                          {day.toLocaleDateString("pl-PL", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </h4>
                        <ul className="space-y-2">
                          {dayBookings.map((booking) => (
                            <li key={booking.id_bookings}>
                              <button
                                type="button"
                                onClick={() => openBookingDetails(booking)}
                                className={`w-full rounded-lg border p-2 text-left text-xs ${
                                  booking.status === "CANCELLED" ||
                                  booking.lesson.status === "CANCELLED"
                                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                                    : "border-brand-yellow/30 bg-brand-yellow/5 text-white"
                                }`}
                              >
                                <span className="block font-semibold">
                                  {booking.lesson.start_time}{" "}
                                  {booking.lesson.subject.name}
                                </span>
                                <span className="mt-1 block text-[10px] opacity-80">
                                  {booking.status === "CANCELLED" ||
                                  booking.lesson.status === "CANCELLED"
                                    ? "Odwołana"
                                    : "Szczegóły"}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
                {weekBookings.length === 0 && (
                  <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-5 text-brand-textMuted">
                    Brak lekcji w tym tygodniu spełniających wybrane kryteria.
                  </p>
                )}
              </>
            ) : displayedBookings.length > 0 ? (
              renderBookings(displayedBookings)
            ) : selectedBookings.length > 0 ? (
              <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-5 text-brand-textMuted">
                Brak lekcji spełniających wybrane kryteria.
              </p>
            ) : selectedPeriod === "upcoming" ? (
              <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-5 text-brand-textMuted">
                Brak nadchodzących lekcji.
              </p>
            ) : (
              <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-5 text-brand-textMuted">
                Nie odbyły się jeszcze żadne lekcje.
              </p>
            )}
          </section>
        </div>
      )}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBookingDetails();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="lesson-details-title"
            className="w-full max-w-lg space-y-5 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-brand-yellow">Szczegóły lekcji</p>
                <h3
                  id="lesson-details-title"
                  ref={dialogTitleRef}
                  tabIndex={-1}
                  className="mt-1 text-xl font-bold text-white"
                >
                  {selectedBooking.lesson.subject.name}
                </h3>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs ${
                  selectedBooking.status === "CANCELLED" ||
                  selectedBooking.lesson.status === "CANCELLED"
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : selectedBooking.lesson.status === "COMPLETED"
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                      : "border-green-500/40 bg-green-500/10 text-green-300"
                }`}
              >
                {selectedBooking.status === "CANCELLED" ||
                selectedBooking.lesson.status === "CANCELLED"
                  ? "Odwołana"
                  : selectedBooking.lesson.status === "COMPLETED"
                    ? "Zakończona"
                    : "Zarezerwowana"}
              </span>
            </div>
            <div className="space-y-3 text-sm text-brand-textMuted">
              <p>
                {formatDate(selectedBooking.lesson.lesson_date)} ·{" "}
                {selectedBooking.lesson.start_time}–
                {selectedBooking.lesson.end_time}
              </p>
              {selectedBooking.lesson.tutor && (
                <p>
                  Korepetytor: {selectedBooking.lesson.tutor.first_name}{" "}
                  {selectedBooking.lesson.tutor.last_name}
                </p>
              )}
              {selectedBooking.student && (
                <p>
                  Uczeń: {selectedBooking.student.first_name}{" "}
                  {selectedBooking.student.last_name}
                </p>
              )}
              {selectedBooking.note && (
                <p>Informacja: {selectedBooking.note}</p>
              )}
              {selectedBooking.lesson.homework && (
                <p>Zadanie domowe: {selectedBooking.lesson.homework}</p>
              )}
              {(selectedBooking.status === "CANCELLED" ||
                selectedBooking.lesson.status === "CANCELLED") && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200">
                  Ta lekcja została odwołana
                  {selectedBooking.lesson.cancelled_at &&
                    ` ${new Date(
                      selectedBooking.lesson.cancelled_at,
                    ).toLocaleString("pl-PL")}`}
                  {selectedBooking.lesson.cancelled_by_user &&
                    ` przez ${selectedBooking.lesson.cancelled_by_user.first_name} ${selectedBooking.lesson.cancelled_by_user.last_name}`}
                  .
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={closeBookingDetails}
              className="rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-brand-black hover:bg-brand-yellowHover"
            >
              Zamknij
            </button>
            {(user?.role === "student" || user?.role === "tutor") && (
              <div className="mt-4 border-t border-brand-cardBorder pt-4">
                {issueSent ? (
                  <p
                    role="status"
                    className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200"
                  >
                    Zgłoszenie zostało wysłane do administratora.
                  </p>
                ) : issueFormOpen ? (
                  <form onSubmit={submitLessonIssue} className="space-y-3">
                    <h4 className="font-semibold text-white">
                      Zgłoś problem z lekcją
                    </h4>
                    {issueError && (
                      <p role="alert" className="text-sm text-red-300">
                        {issueError}
                      </p>
                    )}
                    <label className="block space-y-1 text-sm text-brand-textMuted">
                      Temat
                      <input
                        required
                        minLength={3}
                        maxLength={100}
                        value={issueTitle}
                        onChange={(event) => setIssueTitle(event.target.value)}
                        className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                      />
                    </label>
                    <label className="block space-y-1 text-sm text-brand-textMuted">
                      Opis problemu
                      <textarea
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={4}
                        value={issueDescription}
                        onChange={(event) =>
                          setIssueDescription(event.target.value)
                        }
                        className="w-full resize-y rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={sendingIssue}
                        className="rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-brand-black disabled:opacity-50"
                      >
                        {sendingIssue ? "Wysyłanie…" : "Wyślij zgłoszenie"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIssueFormOpen(false)}
                        className="rounded-lg border border-brand-cardBorder px-4 py-2 text-brand-textMuted"
                      >
                        Anuluj
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIssueFormOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-4 py-2 text-sm text-brand-yellow hover:border-brand-yellow"
                  >
                    <MessageSquareWarning className="size-4" aria-hidden="true" />
                    Zgłoś problem z lekcją
                  </button>
                )}
              </div>
            )}
            {user?.role === "tutor" && onOpenTutorStudents && (
              <button
                type="button"
                onClick={() => {
                  closeBookingDetails();
                  onOpenTutorStudents();
                }}
                className="ml-2 rounded-lg border border-brand-yellow px-4 py-2 font-semibold text-brand-yellow hover:bg-brand-yellow/10"
              >
                Przejdź do obecności i ocen
              </button>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
