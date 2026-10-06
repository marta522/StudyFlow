import axios from "axios";
import {
  CalendarDays,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Star,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

export type TutorAction = "profile" | "review" | "availability";

interface TutorInfo {
  id_users: number;
  first_name: string;
  last_name: string;
  subjects: string[];
  pricePerHour: number | null;
  rating: number | null;
  ratingCount: number;
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
  return "Nie udało się pobrać listy korepetytorów.";
}

interface MyTutorsProps {
  onSelectTutor: (tutorId: number, action: TutorAction) => void;
}

export function MyTutors({ onSelectTutor }: MyTutorsProps) {
  const [tutors, setTutors] = useState<TutorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTutors = useCallback(async () => {
    const { data } = await api.get<TutorInfo[]>("/tutors/me/my-tutors");
    setTutors(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<TutorInfo[]>("/tutors/me/my-tutors")
      .then(({ data }) => {
        if (!cancelled) setTutors(data);
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

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      await loadTutors();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="my-tutors-heading">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
        <div>
          <h2
            id="my-tutors-heading"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <UserRound
              className="size-6 text-brand-yellow"
              aria-hidden="true"
            />
            Moi korepetytorzy
          </h2>
          <p className="mt-1 text-sm text-brand-textMuted">
            Nauczyciele, u których masz aktywną lub zakończoną rezerwację.
          </p>
        </div>
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
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-8 text-center text-brand-textMuted">
          Ładowanie korepetytorów…
        </p>
      ) : !error && tutors.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
          Nie masz jeszcze przypisanych korepetytorów. Zarezerwuj lekcję, aby
          pojawił się tutaj nauczyciel.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {tutors.map((tutor) => (
            <article
              key={tutor.id_users}
              className="space-y-5 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 transition hover:border-brand-yellow/50"
            >
              <div className="flex items-start gap-4">
                <div
                  className="grid size-14 shrink-0 place-items-center rounded-2xl border border-brand-yellow bg-brand-yellow/10 text-xl font-bold text-brand-yellow"
                  aria-hidden="true"
                >
                  {tutor.first_name.charAt(0)}
                  {tutor.last_name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold">
                    {tutor.first_name} {tutor.last_name}
                  </h3>
                  <p className="mt-1 text-sm text-brand-yellow">
                    {tutor.subjects.length > 0
                      ? tutor.subjects.join(", ")
                      : "Brak informacji o przedmiotach"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-textMuted">
                    <span className="inline-flex items-center gap-1">
                      <Star
                        className="size-3.5 fill-brand-yellow text-brand-yellow"
                        aria-hidden="true"
                      />
                      <strong className="text-white">
                        {tutor.rating ?? "—"}
                      </strong>
                      <span>({tutor.ratingCount} opinii)</span>
                    </span>
                    <span>
                      {tutor.pricePerHour === null
                        ? "Brak stawki"
                        : `${tutor.pricePerHour} zł / godz.`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => onSelectTutor(tutor.id_users, "profile")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand-yellow px-3 py-2 text-xs font-semibold text-brand-black transition hover:bg-brand-yellowHover"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />{" "}
                  Zobacz profil
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTutor(tutor.id_users, "review")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-xs font-medium text-white transition hover:border-brand-yellow"
                >
                  <MessageSquare
                    className="size-3.5 text-brand-yellow"
                    aria-hidden="true"
                  />{" "}
                  Wystaw opinię
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTutor(tutor.id_users, "availability")}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-xs font-medium text-brand-textMuted transition hover:border-brand-yellow hover:text-white"
                >
                  <CalendarDays
                    className="size-3.5 text-brand-yellow"
                    aria-hidden="true"
                  />{" "}
                  Dostępność
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
