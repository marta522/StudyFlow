import axios from "axios";
import { Search, Star, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

interface Subject {
  id_subjects: number;
  name: string;
}

interface TutorSearchResult {
  id_users: number;
  first_name: string;
  last_name: string;
  about_me: string | null;
  experience: string | null;
  subjects: {
    id_subjects: number;
    name: string;
    price_per_hour: number;
    experience_years: number | null;
    description: string | null;
  }[];
  rating: number | null;
  rating_count: number;
}

interface ApiError {
  message?: string | string[];
}

interface TutorSearchProps {
  onSelectTutor?: (tutorId: number) => void;
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) return "Nie można połączyć się z serwerem.";
  }
  return "Nie udało się wyszukać korepetytorów.";
}

export function TutorSearch({ onSelectTutor }: TutorSearchProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tutors, setTutors] = useState<TutorSearchResult[]>([]);
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [availableDate, setAvailableDate] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function search(params: Record<string, string>) {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<TutorSearchResult[]>("/tutors/search", {
        params,
      });
      setTutors(data);
    } catch (requestError: unknown) {
      setError(errorMessage(requestError));
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<Subject[]>("/subjects"),
      api.get<TutorSearchResult[]>("/tutors/search"),
    ])
      .then(([subjectResponse, tutorResponse]) => {
        if (cancelled) return;
        setSubjects(subjectResponse.data);
        setTutors(tutorResponse.data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(errorMessage(requestError));
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
    if (query.trim()) params.q = query.trim();
    if (subjectId) params.subject_id = subjectId;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (minRating) params.min_rating = minRating;
    if (availableDate) params.available_date = availableDate;
    void search(params);
  }

  return (
    <section className="space-y-6" aria-labelledby="tutor-search-heading">
      <header>
        <h2
          id="tutor-search-heading"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <Search className="size-6 text-brand-yellow" aria-hidden="true" />
          Wyszukaj korepetytora
        </h2>
        <p className="mt-1 text-sm text-brand-textMuted">
          Filtruj nauczycieli według przedmiotu, ceny, opinii i wolnych terminów.
        </p>
      </header>

      <form
        onSubmit={handleSearch}
        className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-5 sm:grid-cols-2 xl:grid-cols-3"
      >
        <label className="space-y-2 text-sm text-brand-textMuted">
          Imię lub nazwisko
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            minLength={2}
            placeholder="np. Anna"
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
          Cena minimalna (zł / godz.)
          <input
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Cena maksymalna (zł / godz.)
          <input
            type="number"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Minimalna ocena
          <select
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          >
            <option value="">Dowolna</option>
            {[3, 3.5, 4, 4.5, 5].map((rating) => (
              <option key={rating} value={rating}>
                {rating} / 5
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm text-brand-textMuted">
          Wolny termin w dniu
          <input
            type="date"
            min={todayDate}
            onFocus={() =>
              setTodayDate(new Date().toISOString().slice(0, 10))
            }
            value={availableDate}
            onChange={(event) => setAvailableDate(event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50 sm:col-span-2 xl:col-span-3"
        >
          <Search className="size-4" aria-hidden="true" />
          Wyszukaj
        </button>
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
          Wyszukiwanie korepetytorów…
        </p>
      ) : !error && tutors.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
          Nie znaleziono korepetytorów spełniających wybrane kryteria.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {tutors.map((tutor) => (
            <article
              key={tutor.id_users}
              className="space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
            >
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-yellow/10 text-brand-yellow">
                  <UserRound className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold">
                    {tutor.first_name} {tutor.last_name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-sm text-brand-textMuted">
                    <Star
                      className="size-4 fill-brand-yellow text-brand-yellow"
                      aria-hidden="true"
                    />
                    {tutor.rating === null
                      ? "Brak opinii"
                      : `${tutor.rating} / 5 (${tutor.rating_count})`}
                  </p>
                </div>
              </div>
              {tutor.about_me && (
                <p className="text-sm leading-6 text-brand-textMuted">
                  {tutor.about_me}
                </p>
              )}
              <ul className="space-y-2">
                {tutor.subjects.map((subject) => (
                  <li
                    key={subject.id_subjects}
                    className="flex flex-wrap justify-between gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm"
                  >
                    <span>{subject.name}</span>
                    <span className="font-semibold text-brand-yellow">
                      {subject.price_per_hour} zł / godz.
                    </span>
                  </li>
                ))}
              </ul>
              {tutor.experience && (
                <p className="text-xs text-brand-textMuted">
                  Doświadczenie: {tutor.experience}
                </p>
              )}
              {onSelectTutor ? (
                <button
                  type="button"
                  onClick={() => onSelectTutor(tutor.id_users)}
                  className="w-full rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover"
                >
                  Zobacz profil i dostępne terminy
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block rounded-lg bg-brand-yellow px-4 py-2.5 text-center text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover"
                >
                  Zaloguj się, aby zarezerwować lekcję
                </Link>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
