import axios from "axios";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Send,
  Star,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import api from "../api/axios";
import type { TutorAction } from "./MyTutors";

interface TutorDetail {
  id_users: number;
  first_name: string;
  last_name: string;
  about_me: string | null;
  experience: string | null;
  subjects: { id_subjects: number; name: string; price_per_hour: number }[];
  rating: number | null;
  rating_count: number;
}

interface AvailableLesson {
  id_lessons: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  subject: { name: string };
}

interface Review {
  id_reviews: number;
  rating: number;
  comment: string | null;
  created_at: string;
  student: { first_name: string; last_name: string };
}

interface Booking {
  status: string;
  lesson: { tutor: { id_users: number }; status: string };
}

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
  return "Nie udało się pobrać danych korepetytora.";
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

interface TutorDetailViewProps {
  tutorId: number;
  initialAction: TutorAction;
  onBack: () => void;
}

export function TutorDetailView({
  tutorId,
  initialAction,
  onBack,
}: TutorDetailViewProps) {
  const [tutor, setTutor] = useState<TutorDetail | null>(null);
  const [lessons, setLessons] = useState<AvailableLesson[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const reviewSectionRef = useRef<HTMLElement>(null);
  const availabilitySectionRef = useRef<HTMLElement>(null);

  async function loadReviews() {
    const { data } = await api.get<Review[]>(`/reviews/tutor/${tutorId}`);
    setReviews(data);
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<TutorDetail>(`/tutors/${tutorId}/profile`),
      api.get<AvailableLesson[]>(`/tutors/${tutorId}/availability`),
      api.get<Review[]>(`/reviews/tutor/${tutorId}`),
      api.get<Booking[]>("/bookings/my-bookings"),
    ])
      .then(
        ([
          profileResponse,
          lessonResponse,
          reviewResponse,
          bookingResponse,
        ]) => {
          if (cancelled) return;
          setTutor(profileResponse.data);
          setLessons(lessonResponse.data);
          setReviews(reviewResponse.data);
          setCanReview(
            bookingResponse.data.some(
              (booking) =>
                booking.status !== "CANCELLED" &&
                booking.lesson.tutor.id_users === tutorId &&
                booking.lesson.status === "COMPLETED",
            ),
          );
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
  }, [tutorId]);

  useEffect(() => {
    if (initialAction === "review") {
      reviewSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else if (initialAction === "availability") {
      availabilitySectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [initialAction, loading]);

  async function handleSubmitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/reviews", {
        tutor_id: tutorId,
        rating,
        comment: comment.trim(),
      });
      const refreshedReviews = await loadReviews();
      const newRating =
        refreshedReviews.reduce((sum, review) => sum + review.rating, 0) /
        refreshedReviews.length;
      setTutor((current) => {
        if (!current) return current;
        return {
          ...current,
          rating: Math.round(newRating * 100) / 100,
          rating_count: refreshedReviews.length,
        };
      });
      setComment("");
      setNotice("Twoja opinia została dodana.");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBookLesson(lessonId: number) {
    setBookingId(lessonId);
    setError(null);
    setNotice(null);
    try {
      await api.post("/bookings/book", { lesson_id: lessonId });
      setLessons((current) =>
        current.filter((lesson) => lesson.id_lessons !== lessonId),
      );
      setNotice("Pomyślnie zarezerwowano lekcję.");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setBookingId(null);
    }
  }

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-yellow hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Powrót do listy korepetytorów
      </button>
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
          className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-10 text-center text-brand-textMuted">
          Ładowanie profilu korepetytora…
        </p>
      ) : !tutor ? (
        <p className="rounded-xl border border-brand-cardBorder bg-brand-card p-6 text-brand-textMuted">
          Nie udało się wyświetlić profilu korepetytora.
        </p>
      ) : (
        <>
          <header className="flex flex-col items-center gap-6 rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center md:flex-row md:text-left">
            <div
              className="grid size-24 shrink-0 place-items-center rounded-full border-2 border-brand-yellow bg-brand-yellow/10 text-3xl font-extrabold text-brand-yellow"
              aria-hidden="true"
            >
              {tutor.first_name.charAt(0)}
              {tutor.last_name.charAt(0)}
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold">
                {tutor.first_name} {tutor.last_name}
              </h2>
              <p className="flex flex-wrap items-center justify-center gap-2 text-sm text-brand-yellow md:justify-start">
                <BookOpen className="size-4" aria-hidden="true" />
                {tutor.subjects.length > 0
                  ? tutor.subjects.map((subject) => subject.name).join(", ")
                  : "Brak przedmiotów w ofercie"}
              </p>
              <p className="inline-flex items-center gap-2 text-sm text-brand-textMuted">
                <Star
                  className="size-4 fill-brand-yellow text-brand-yellow"
                  aria-hidden="true"
                />
                {tutor.rating === null ? "Brak ocen" : `${tutor.rating}/5`}
                <span>({tutor.rating_count} opinii)</span>
              </p>
            </div>
          </header>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <article className="space-y-2 rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
              <h3 className="text-lg font-bold text-brand-yellow">O mnie</h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-textMuted">
                {tutor.about_me || "Korepetytor nie dodał jeszcze opisu."}
              </p>
            </article>
            <article className="space-y-2 rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
              <h3 className="text-lg font-bold text-brand-yellow">
                Doświadczenie
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-brand-textMuted">
                {tutor.experience ||
                  "Korepetytor nie dodał jeszcze informacji o doświadczeniu."}
              </p>
            </article>
          </div>

          <section
            ref={availabilitySectionRef}
            className="scroll-mt-6 space-y-4"
            aria-labelledby="tutor-availability-heading"
          >
            <h3
              id="tutor-availability-heading"
              className="flex items-center gap-2 text-xl font-bold"
            >
              <CalendarDays
                className="size-5 text-brand-yellow"
                aria-hidden="true"
              />
              Dostępne terminy do rezerwacji
            </h3>
            {lessons.length === 0 ? (
              <p className="rounded-xl border border-brand-cardBorder bg-brand-card p-5 text-sm text-brand-textMuted">
                Brak wolnych terminów. Sprawdź ponownie później.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {lessons.map((lesson) => (
                  <article
                    key={lesson.id_lessons}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-cardBorder bg-brand-card p-5"
                  >
                    <div>
                      <h4 className="font-bold text-brand-yellow">
                        {lesson.subject.name}
                      </h4>
                      <p className="mt-1 flex items-center gap-2 text-sm text-brand-textMuted">
                        <CalendarDays
                          className="size-4 text-brand-yellow"
                          aria-hidden="true"
                        />
                        {formatDate(lesson.lesson_date)}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm text-brand-textMuted">
                        <Clock3
                          className="size-4 text-brand-yellow"
                          aria-hidden="true"
                        />
                        {lesson.start_time}–{lesson.end_time}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBookLesson(lesson.id_lessons)}
                      disabled={bookingId !== null}
                      className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-black hover:bg-brand-yellowHover disabled:opacity-50"
                    >
                      {bookingId === lesson.id_lessons
                        ? "Rezerwowanie…"
                        : "Zarezerwuj"}
                    </button>
                  </article>
                ))}
              </div>
            )}
            {tutor.subjects.length > 0 && (
              <p className="text-xs text-brand-textMuted">
                Stawki:{" "}
                {tutor.subjects
                  .map(
                    (subject) =>
                      `${subject.name} — ${subject.price_per_hour} zł/h`,
                  )
                  .join(" · ")}
              </p>
            )}
          </section>

          <section
            ref={reviewSectionRef}
            className="scroll-mt-6 space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
            aria-labelledby="write-review-heading"
          >
            <h3
              id="write-review-heading"
              className="flex items-center gap-2 text-xl font-bold"
            >
              <Star className="size-5 text-brand-yellow" aria-hidden="true" />
              Wystaw opinię
            </h3>
            {!canReview ? (
              <p className="text-sm text-brand-textMuted">
                Opinię możesz dodać po ukończonej lekcji z tym korepetytorem.
                Każdą lekcję można ocenić tylko raz.
              </p>
            ) : (
              <form
                onSubmit={(event) => void handleSubmitReview(event)}
                className="max-w-xl space-y-4"
              >
                <label className="block text-sm text-brand-textMuted">
                  Ocena (1–5 gwiazdek)
                  <select
                    value={rating}
                    onChange={(event) => setRating(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>
                        {"★".repeat(value)} ({value}/5)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-brand-textMuted">
                  Treść opinii
                  <textarea
                    required
                    maxLength={5000}
                    rows={4}
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Napisz, jak oceniasz zajęcia i podejście korepetytora…"
                    className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black p-3 text-sm text-white"
                  />
                </label>
                <button
                  type="submit"
                  disabled={submitting || !comment.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-5 py-2 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
                >
                  <Send className="size-4" aria-hidden="true" />
                  {submitting ? "Wysyłanie…" : "Wyślij opinię"}
                </button>
              </form>
            )}
          </section>

          <section
            className="space-y-4"
            aria-labelledby="tutor-reviews-heading"
          >
            <h3 id="tutor-reviews-heading" className="text-xl font-bold">
              Opinie uczniów
            </h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-brand-textMuted">
                Brak wystawionych opinii dla tego korepetytora.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {reviews.map((review) => (
                  <article
                    key={review.id_reviews}
                    className="space-y-3 rounded-xl border border-brand-cardBorder bg-brand-card p-5"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-brand-cardBorder pb-3">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold">
                        <UserRound
                          className="size-4 text-brand-yellow"
                          aria-hidden="true"
                        />
                        {review.student.first_name} {review.student.last_name}
                      </span>
                      <span className="font-bold text-brand-yellow">
                        ★ {review.rating}/5
                      </span>
                    </div>
                    {review.comment && (
                      <p className="whitespace-pre-wrap text-sm text-brand-textMuted">
                        {review.comment}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
}
