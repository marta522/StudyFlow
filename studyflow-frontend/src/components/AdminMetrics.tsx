import axios from "axios";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Download,
  GraduationCap,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import { downloadCsv } from "../utils/csv";

interface AdminMetricsData {
  year: number;
  studentCount: number;
  activeStudentCount: number;
  tutorCount: number;
  activeTutorCount: number;
  averageRating: number | null;
  pendingRequests: number;
  cancelledLessonCount: number;
  completedLessonCount: number;
  monthlyRevenue: { month: number; revenue: number }[];
  lessonsBySubject: { name: string; count: number; percentage: number }[];
  upcomingLessons: {
    id_lessons: number;
    lesson_date: string;
    start_time: string;
    end_time: string;
    subject: { name: string };
    tutor: { first_name: string; last_name: string };
    bookings: { student: { first_name: string; last_name: string } }[];
  }[];
  pendingRequestItems: {
    id_subject_requests: number;
    subject_name: string;
    created_at: string;
    tutor: { first_name: string; last_name: string };
  }[];
  recentlyCancelledLessons: {
    id_lessons: number;
    lesson_date: string;
    cancelled_at: string | null;
    subject: { name: string };
    tutor: { first_name: string; last_name: string };
  }[];
  tutorUtilization: {
    tutorId: number;
    tutorName: string;
    weeklyHours: number;
    bookedHours: number;
    utilizationPercentage: number;
  }[];
}

interface ApiError {
  message?: string | string[];
}

const MONTHS = [
  "Sty",
  "Lut",
  "Mar",
  "Kwi",
  "Maj",
  "Cze",
  "Lip",
  "Sie",
  "Wrz",
  "Paź",
  "Lis",
  "Gru",
];

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) return "Nie można połączyć się z serwerem.";
  }
  return "Nie udało się pobrać metryk administratora.";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminMetrics({
  onGoToRequests,
  onGoToSchedule,
}: {
  onGoToRequests?: () => void;
  onGoToSchedule?: () => void;
}) {
  const [metrics, setMetrics] = useState<AdminMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get<AdminMetricsData>("/users/metrics");
      setMetrics(data);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<AdminMetricsData>("/users/metrics")
      .then(({ data }) => {
        if (!cancelled) setMetrics(data);
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

  function exportMetrics() {
    if (!metrics) return;
    const rows = [
      ["Metryka", "Wartość"],
      ["Aktywni uczniowie", String(metrics.activeStudentCount)],
      ["Aktywni korepetytorzy", String(metrics.activeTutorCount)],
      ["Oczekujące zgłoszenia", String(metrics.pendingRequests)],
      ["Odwołane lekcje łącznie", String(metrics.cancelledLessonCount)],
      ["Ukończone lekcje", String(metrics.completedLessonCount)],
      ["Przedmiot", "Liczba ukończonych lekcji"],
      ...metrics.lessonsBySubject.map((subject) => [subject.name, String(subject.count)]),
    ];
    downloadCsv(`metryki-studyflow-${metrics.year}.csv`, rows);
  }

  const maxRevenue = Math.max(
    ...(metrics?.monthlyRevenue.map((item) => item.revenue) ?? [0]),
    1,
  );

  const cards = metrics
    ? [
        {
          label: "Aktywni uczniowie",
          value: `${metrics.activeStudentCount} / ${metrics.studentCount}`,
          icon: Users,
        },
        {
          label: "Aktywni korepetytorzy",
          value: `${metrics.activeTutorCount} / ${metrics.tutorCount}`,
          icon: GraduationCap,
        },
        {
          label: "Średnia ocena",
          value:
            metrics.averageRating === null
              ? "—"
              : Number(metrics.averageRating).toLocaleString("pl-PL", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                }),
          icon: Star,
        },
        {
          label: "Zgłoszenia do rozpatrzenia",
          value: metrics.pendingRequests.toLocaleString("pl-PL"),
          icon: AlertCircle,
        },
        {
          label: "Odwołane lekcje",
          value: metrics.cancelledLessonCount.toLocaleString("pl-PL"),
          icon: CalendarDays,
        },
      ]
    : [];

  return (
    <section className="space-y-6" aria-labelledby="admin-metrics-heading">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="admin-metrics-heading" className="text-2xl font-bold">
            Metryki systemu
          </h2>
          <p className="mt-1 text-sm text-brand-textMuted">
            Podsumowanie użytkowników, opinii i ukończonych lekcji.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadMetrics();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Odśwież
        </button>
        <button
          type="button"
          onClick={exportMetrics}
          disabled={!metrics}
          className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden="true" />
          Eksportuj CSV
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {loading && !metrics ? (
        <p role="status" className="py-8 text-center text-brand-textMuted">
          Ładowanie metryk…
        </p>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map(({ label, value, icon: Icon }) => (
              <article
                key={label}
                className="flex items-center justify-between gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-5"
              >
                <div>
                  <p className="text-xs font-semibold uppercase text-brand-textMuted">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold">
                    {loading ? "…" : value}
                  </p>
                </div>
                <span className="rounded-2xl bg-brand-yellow/10 p-3 text-brand-yellow">
                  <Icon className="size-7" aria-hidden="true" />
                </span>
              </article>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5">
            <section
              className="space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
              aria-labelledby="admin-action-center"
            >
              <h3 id="admin-action-center" className="text-lg font-bold">
                Do załatwienia
              </h3>
              <div className="flex flex-wrap gap-2">
                {onGoToRequests && (
                  <button
                    type="button"
                    onClick={onGoToRequests}
                    className="rounded-lg border border-brand-cardBorder px-3 py-1.5 text-xs font-semibold text-brand-yellow hover:border-brand-yellow"
                  >
                    Otwórz zgłoszenia
                  </button>
                )}
                {onGoToSchedule && (
                  <button
                    type="button"
                    onClick={onGoToSchedule}
                    className="rounded-lg border border-brand-cardBorder px-3 py-1.5 text-xs font-semibold text-brand-yellow hover:border-brand-yellow"
                  >
                    Otwórz harmonogram
                  </button>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-brand-yellow">
                  Zgłoszenia oczekujące ({metrics.pendingRequests})
                </h4>
                {metrics.pendingRequestItems.length === 0 ? (
                  <p className="text-sm text-brand-textMuted">Brak zgłoszeń do rozpatrzenia.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {metrics.pendingRequestItems.map((request) => (
                      <li
                        key={request.id_subject_requests}
                        className="flex flex-wrap justify-between gap-2 rounded-lg bg-brand-black/60 px-3 py-2"
                      >
                        <span>{request.subject_name} · {request.tutor.first_name} {request.tutor.last_name}</span>
                        <time className="text-xs text-brand-textMuted">
                          {new Date(request.created_at).toLocaleDateString("pl-PL")}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-brand-yellow">
                  Najbliższe lekcje
                </h4>
                {metrics.upcomingLessons.length === 0 ? (
                  <p className="text-sm text-brand-textMuted">Brak lekcji w najbliższych 7 dniach.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {metrics.upcomingLessons.slice(0, 8).map((lesson) => (
                      <li
                        key={lesson.id_lessons}
                        className="rounded-lg bg-brand-black/60 px-3 py-2"
                      >
                        <p>
                          {new Date(lesson.lesson_date).toLocaleDateString("pl-PL")} · {lesson.start_time}–{lesson.end_time} · {lesson.subject.name}
                        </p>
                        <p className="mt-1 text-xs text-brand-textMuted">
                          {lesson.tutor.first_name} {lesson.tutor.last_name}
                          {lesson.bookings[0] &&
                            ` · ${lesson.bookings.map(({ student }) => `${student.first_name} ${student.last_name}`).join(", ")}`}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-red-300">
                  Ostatnie odwołania (30 dni)
                </h4>
                {metrics.recentlyCancelledLessons.length === 0 ? (
                  <p className="text-sm text-brand-textMuted">Brak odwołanych lekcji.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {metrics.recentlyCancelledLessons.map((lesson) => (
                      <li
                        key={lesson.id_lessons}
                        className="flex flex-wrap justify-between gap-2 rounded-lg bg-red-500/5 px-3 py-2"
                      >
                        <span>
                          {lesson.subject.name} · {lesson.tutor.first_name} {lesson.tutor.last_name}
                        </span>
                        <time className="text-xs text-brand-textMuted">
                          {new Date(lesson.cancelled_at ?? lesson.lesson_date).toLocaleDateString("pl-PL")}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
            <h3 className="mb-4 text-lg font-bold">Obłożenie korepetytorów w najbliższych 7 dniach</h3>
            {metrics.tutorUtilization.length === 0 ? (
              <p className="text-sm text-brand-textMuted">Brak aktywnych korepetytorów z ustawioną dostępnością.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {metrics.tutorUtilization.map((tutor) => (
                  <article key={tutor.tutorId} className="rounded-xl bg-brand-black/60 p-4">
                    <div className="mb-2 flex justify-between text-sm">
                      <span>{tutor.tutorName}</span>
                      <span className="font-semibold text-brand-yellow">{tutor.utilizationPercentage}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-cardBorder">
                      <div
                        className="h-full rounded-full bg-brand-yellow"
                        style={{ width: `${tutor.utilizationPercentage}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-brand-textMuted">
                      {tutor.bookedHours} h z {tutor.weeklyHours} h dostępności
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section
              className="space-y-5 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 xl:col-span-2"
              aria-labelledby="admin-revenue-heading"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3
                  id="admin-revenue-heading"
                  className="flex items-center gap-2 text-lg font-bold"
                >
                  <TrendingUp
                    className="size-5 text-brand-yellow"
                    aria-hidden="true"
                  />
                  Szacowana wartość zrealizowanych lekcji
                </h3>
                <span className="rounded-full bg-brand-yellow/10 px-3 py-1 text-xs font-bold text-brand-yellow">
                  {metrics.year}
                </span>
              </div>
              <p className="text-xs text-brand-textMuted">
                Wyliczenie na podstawie stawki korepetytora i czasu ukończonych,
                zarezerwowanych lekcji.
              </p>
              <div
                className="flex h-56 items-end justify-between gap-1 border-b border-brand-cardBorder px-1 pt-4 sm:gap-2"
                role="img"
                aria-label={`Szacowana wartość zrealizowanych lekcji w poszczególnych miesiącach ${metrics.year}`}
              >
                {metrics.monthlyRevenue.map(({ month, revenue }) => {
                  const height =
                    revenue > 0 ? Math.max((revenue / maxRevenue) * 100, 3) : 0;
                  return (
                    <div
                      key={month}
                      className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    >
                      <span className="invisible text-[10px] text-brand-textMuted group-hover:visible">
                        {formatCurrency(revenue)}
                      </span>
                      <div
                        title={`${MONTHS[month - 1]}: ${formatCurrency(revenue)}`}
                        style={{ height: `${height}%` }}
                        className={`w-full max-w-10 rounded-t-md bg-brand-yellow transition hover:bg-brand-yellowHover ${revenue === 0 ? "opacity-20" : ""}`}
                      />
                      <span className="text-[10px] text-brand-textMuted sm:text-xs">
                        {MONTHS[month - 1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section
              className="space-y-5 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
              aria-labelledby="admin-lessons-heading"
            >
              <div>
                <h3
                  id="admin-lessons-heading"
                  className="flex items-center gap-2 text-lg font-bold"
                >
                  <BarChart3
                    className="size-5 text-brand-yellow"
                    aria-hidden="true"
                  />
                  Ukończone lekcje
                </h3>
                <p className="mt-1 text-xs text-brand-textMuted">
                  Łącznie: {metrics.completedLessonCount}
                </p>
              </div>
              {metrics.lessonsBySubject.length === 0 ? (
                <p className="text-sm text-brand-textMuted">
                  Brak ukończonych lekcji do podsumowania.
                </p>
              ) : (
                <div className="space-y-4">
                  {metrics.lessonsBySubject.map((subject) => (
                    <div key={subject.name}>
                      <div className="mb-1 flex justify-between gap-3 text-xs">
                        <span className="truncate text-brand-textMuted">
                          {subject.name}
                        </span>
                        <span className="shrink-0 font-bold text-white">
                          {subject.percentage}% · {subject.count}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-brand-black"
                        role="progressbar"
                        aria-label={`${subject.name}: ${subject.percentage}%`}
                        aria-valuenow={subject.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <div
                          className="h-full rounded-full bg-brand-yellow"
                          style={{ width: `${subject.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}
