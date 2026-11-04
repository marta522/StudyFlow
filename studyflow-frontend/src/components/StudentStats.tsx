import axios from "axios";
import { Award, BookOpen, Clock3, RefreshCw, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { useFeedback } from "./useFeedback";

interface Grade {
  id_monthly_grades: number;
  month: number;
  year: number;
  grade: number | string;
  comment: string | null;
  subject: { name: string };
  tutor: { first_name: string; last_name: string };
}

interface Booking {
  id_bookings: number;
  status: string;
  lesson: {
    status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
    start_time: string;
    end_time: string;
    subject: { name: string };
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
  return "Nie udało się pobrać statystyk.";
}

function durationInHours(start: string, end: string): number {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const duration = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return duration > 0 ? duration / 60 : 0;
}

export function StudentStats() {
  const { notify } = useFeedback();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) notify(error, "error");
  }, [error, notify]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gradeResponse, bookingResponse] = await Promise.all([
        api.get<Grade[]>("/grades/my-grades"),
        api.get<Booking[]>("/bookings/my-bookings"),
      ]);
      setGrades(gradeResponse.data);
      setCompletedBookings(
        bookingResponse.data.filter(
          (booking) =>
            booking.status !== "CANCELLED" &&
            booking.lesson.status === "COMPLETED",
        ),
      );
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<Grade[]>("/grades/my-grades"),
      api.get<Booking[]>("/bookings/my-bookings"),
    ])
      .then(([gradeResponse, bookingResponse]) => {
        if (cancelled) return;
        setGrades(gradeResponse.data);
        setCompletedBookings(
          bookingResponse.data.filter(
            (booking) =>
              booking.status !== "CANCELLED" &&
              booking.lesson.status === "COMPLETED",
          ),
        );
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

  const average =
    grades.length > 0
      ? (
          grades.reduce((sum, grade) => sum + Number(grade.grade), 0) /
          grades.length
        ).toFixed(2)
      : "—";
  const hours = completedBookings
    .reduce(
      (sum, booking) =>
        sum +
        durationInHours(booking.lesson.start_time, booking.lesson.end_time),
      0,
    )
    .toFixed(1);
  const lessonsBySubject = completedBookings.reduce<
    Record<string, { count: number; hours: number }>
  >((summary, booking) => {
    const subjectName = booking.lesson.subject.name;
    const subject = (summary[subjectName] ??= { count: 0, hours: 0 });
    subject.count += 1;
    subject.hours += durationInHours(
      booking.lesson.start_time,
      booking.lesson.end_time,
    );
    return summary;
  }, {});
  const gradesByMonth = Object.values(
    grades.reduce<
      Record<
        string,
        { month: number; year: number; total: number; count: number }
      >
    >((summary, grade) => {
      const key = `${grade.year}-${String(grade.month).padStart(2, "0")}`;
      const point = (summary[key] ??= {
        month: grade.month,
        year: grade.year,
        total: 0,
        count: 0,
      });
      point.total += Number(grade.grade);
      point.count += 1;
      return summary;
    }, {}),
  )
    .map((point) => ({ ...point, average: point.total / point.count }))
    .sort((left, right) => left.year - right.year || left.month - right.month)
    .slice(-12);
  const chartPoints = gradesByMonth.map((point, index) => ({
    ...point,
    x:
      gradesByMonth.length === 1
        ? 200
        : 35 + (index * 330) / (gradesByMonth.length - 1),
    y: 145 - (point.average / 6) * 125,
  }));
  const chartPath = chartPoints
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");

  const stats = [
    {
      icon: Award,
      label: "Średnia ocen",
      value: average,
    },
    {
      icon: BookOpen,
      label: "Wystawione oceny",
      value: String(grades.length),
    },
    {
      icon: BookOpen,
      label: "Zrealizowane lekcje",
      value: String(completedBookings.length),
    },
    {
      icon: Clock3,
      label: "Zrealizowane godziny",
      value: hours,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Oceny i postępy</h2>
          <p className="mt-1 text-sm text-brand-textMuted">
            Podsumowanie Twojej pracy i miesięczne oceny.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStats()}
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <article
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
          >
            <span className="rounded-2xl bg-brand-yellow/10 p-4 text-brand-yellow">
              <Icon className="size-8" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase text-brand-textMuted">
                {label}
              </p>
              <p className="mt-1 text-3xl font-extrabold">
                {loading ? "…" : value}
              </p>
            </div>
          </article>
        ))}
      </div>

      <section className="space-y-4" aria-labelledby="subject-progress-title">
        <h3 id="subject-progress-title" className="text-xl font-bold">
          Zrealizowane zajęcia według przedmiotu
        </h3>
        {loading ? (
          <p role="status" className="text-brand-textMuted">
            Ładowanie statystyk przedmiotów…
          </p>
        ) : Object.keys(lessonsBySubject).length === 0 ? (
          <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-brand-textMuted">
            Nie masz jeszcze zrealizowanych lekcji.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(lessonsBySubject)
              .sort(([left], [right]) => left.localeCompare(right, "pl"))
              .map(([subject, summary]) => (
                <article
                  key={subject}
                  className="rounded-2xl border border-brand-cardBorder bg-brand-card p-5"
                >
                  <h4 className="font-bold text-brand-yellow">{subject}</h4>
                  <p className="mt-2 text-sm text-brand-textMuted">
                    {summary.count}{" "}
                    {summary.count === 1
                      ? "zrealizowana lekcja"
                      : "zrealizowane lekcje"}
                  </p>
                  <p className="mt-1 text-sm text-brand-textMuted">
                    {summary.hours.toFixed(1)} godz.
                  </p>
                </article>
              ))}
          </div>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="grade-progress-title">
        <h3 id="grade-progress-title" className="text-xl font-bold">
          Postępy w nauce
        </h3>
        {loading ? (
          <div
            role="status"
            aria-label="Ładowanie wykresu postępów"
            className="h-56 animate-pulse rounded-2xl border border-brand-cardBorder bg-brand-card"
          />
        ) : gradesByMonth.length === 0 ? (
          <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-brand-textMuted">
            Wykres pojawi się po otrzymaniu pierwszej oceny miesięcznej.
          </p>
        ) : (
          <figure
            role="img"
            aria-label={`Średnia ocen w kolejnych miesiącach: ${chartPoints
              .map(
                (point) =>
                  `${point.month}/${point.year}: ${point.average.toFixed(2)}`,
              )
              .join("; ")}`}
            className="rounded-2xl border border-brand-cardBorder bg-brand-card p-4 sm:p-6"
          >
            <svg
              viewBox="0 0 400 190"
              className="h-auto w-full"
              aria-hidden="true"
            >
              {[1, 3, 5].map((gradeValue) => {
                const y = 145 - (gradeValue / 6) * 125;
                return (
                  <g key={gradeValue}>
                    <line
                      x1="30"
                      x2="375"
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity=".15"
                    />
                    <text
                      x="7"
                      y={y + 4}
                      fill="currentColor"
                      fontSize="11"
                      className="text-brand-textMuted"
                    >
                      {gradeValue}
                    </text>
                  </g>
                );
              })}
              {chartPoints.length > 1 && (
                <path
                  d={chartPath}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {chartPoints.map((point) => (
                <g key={`${point.year}-${point.month}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill="#facc15"
                    stroke="#111"
                    strokeWidth="2"
                  />
                  <text
                    x={point.x}
                    y="174"
                    textAnchor="middle"
                    fill="currentColor"
                    fontSize="10"
                  >
                    {`${point.month}/${String(point.year).slice(-2)}`}
                  </text>
                </g>
              ))}
            </svg>
            <figcaption className="mt-2 text-center text-xs text-brand-textMuted">
              Średnia ocen miesięcznych w skali 1–6
            </figcaption>
          </figure>
        )}
      </section>

      <section className="space-y-4" aria-labelledby="monthly-grades-title">
        <h3
          id="monthly-grades-title"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <TrendingUp className="size-6 text-brand-yellow" aria-hidden="true" />
          Oceny miesięczne i uwagi korepetytorów
        </h3>

        {loading ? (
          <p role="status" className="text-brand-textMuted">
            Ładowanie ocen…
          </p>
        ) : !error && grades.length === 0 ? (
          <div className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
            Brak ocen miesięcznych.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {grades.map((grade) => (
              <article
                key={grade.id_monthly_grades}
                className="space-y-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-5"
              >
                <div className="flex items-center justify-between gap-4 border-b border-brand-cardBorder pb-3">
                  <div>
                    <h4 className="text-lg font-bold text-brand-yellow">
                      {grade.subject.name}
                    </h4>
                    <p className="text-xs text-brand-textMuted">
                      Korepetytor: {grade.tutor.first_name}{" "}
                      {grade.tutor.last_name}
                    </p>
                  </div>
                  <span className="grid size-12 place-items-center rounded-xl bg-brand-yellow text-2xl font-extrabold text-brand-black">
                    {Number(grade.grade)}
                  </span>
                </div>
                <p className="text-xs text-brand-textMuted">
                  Okres: {grade.month}/{grade.year}
                </p>
                {grade.comment && (
                  <p className="rounded-xl border border-brand-cardBorder bg-brand-black p-3 text-sm text-gray-200">
                    {grade.comment}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
