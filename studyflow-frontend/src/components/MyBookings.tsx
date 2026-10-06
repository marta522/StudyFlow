import axios from "axios";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";

interface Person {
  first_name: string;
  last_name: string;
  email?: string;
}

interface Booking {
  id_bookings: number;
  booking_date: string;
  status: string;
  lesson: {
    lesson_date: string;
    start_time: string;
    end_time: string;
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

export function MyBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      : "Moje zarezerwowane lekcje";

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
        <p role="status" className="py-8 text-center text-brand-textMuted">
          Ładowanie rezerwacji…
        </p>
      ) : !error && bookings.length === 0 ? (
        <div className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
          Brak aktywnych rezerwacji.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {bookings.map((booking) => {
            const otherPerson =
              user?.role === "student" ? booking.lesson.tutor : booking.student;
            const personLabel =
              user?.role === "student"
                ? "Korepetytor"
                : user?.role === "admin"
                  ? "Uczeń"
                  : "Uczeń";

            return (
              <article
                key={booking.id_bookings}
                className="space-y-3 rounded-xl border border-brand-cardBorder bg-brand-card p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <BookOpen
                      className="size-5 text-brand-yellow"
                      aria-hidden="true"
                    />
                    {booking.lesson.subject.name}
                  </h3>
                  <span className="flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-xs text-green-400">
                    <CheckCircle2 className="size-3" aria-hidden="true" />
                    {booking.status}
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
      )}
    </section>
  );
}
