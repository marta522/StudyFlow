import axios from "axios";
import {
  BookPlus,
  CheckCircle2,
  PlusCircle,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";
import { useAuth } from "../context/useAuth";

interface SubjectRequest {
  id_subject_requests: number;
  subject_name: string;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  tutor: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ApiError {
  message?: string | string[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) {
      return "Nie można połączyć się z serwerem. Sprawdź, czy backend działa.";
    }
  }
  return fallback;
}

export function SubjectRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SubjectRequest[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    const { data } = await api.get<SubjectRequest[]>("/subjects/requests");
    setRequests(data);
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;

    let cancelled = false;
    void api
      .get<SubjectRequest[]>("/subjects/requests")
      .then(({ data }) => {
        if (!cancelled) setRequests(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            getErrorMessage(
              requestError,
              "Nie udało się pobrać zgłoszeń przedmiotów.",
            ),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role]);

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/subjects/requests", {
        subject_name: subjectName.trim(),
        description: description.trim() || undefined,
      });
      setNotice("Zgłoszenie zostało przesłane administratorowi.");
      setSubjectName("");
      setDescription("");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Nie udało się zgłosić przedmiotu."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReview(
    requestId: number,
    status: "APPROVED" | "REJECTED",
  ) {
    setReviewingId(requestId);
    setError(null);
    setNotice(null);
    try {
      await api.patch(`/subjects/requests/${requestId}`, { status });
      setNotice(
        status === "APPROVED"
          ? "Zgłoszenie zaakceptowano, a przedmiot został dodany."
          : "Zgłoszenie odrzucono.",
      );
      await fetchRequests();
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Nie udało się zaktualizować zgłoszenia.",
        ),
      );
    } finally {
      setReviewingId(null);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {notice && (
        <p
          className="flex items-center gap-2 rounded-xl border border-brand-yellow bg-brand-yellow/10 p-4 text-sm text-brand-yellow"
          role="status"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          {notice}
        </p>
      )}
      {error && (
        <p
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}

      {user?.role === "tutor" && (
        <section className="space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
          <h2 className="flex items-center gap-2 text-xl font-bold text-brand-yellow">
            <PlusCircle className="size-6" aria-hidden="true" />
            Zgłoszenie nowego przedmiotu
          </h2>
          <p className="text-sm text-brand-textMuted">
            Nie ma przedmiotu, którego szukasz? Wyślij prośbę do administratora.
          </p>
          <form onSubmit={handleRequestSubmit} className="max-w-lg space-y-4">
            <div>
              <label
                htmlFor="requested-subject-name"
                className="mb-1 block text-xs text-brand-textMuted"
              >
                Nazwa przedmiotu
              </label>
              <input
                id="requested-subject-name"
                type="text"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                required
                maxLength={100}
                className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-yellow"
                placeholder="np. Astronomia"
              />
            </div>
            <div>
              <label
                htmlFor="requested-subject-description"
                className="mb-1 block text-xs text-brand-textMuted"
              >
                Opis / uzasadnienie
              </label>
              <textarea
                id="requested-subject-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white outline-none focus:border-brand-yellow"
                placeholder="Krótki opis zakresu nauczania…"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand-yellow px-6 py-2 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:cursor-wait disabled:opacity-60"
            >
              {submitting ? "Wysyłanie…" : "Wyślij zgłoszenie"}
            </button>
          </form>
        </section>
      )}

      {user?.role === "admin" && (
        <section className="space-y-4" aria-labelledby="pending-subjects-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="pending-subjects-title"
              className="flex items-center gap-2 text-xl font-bold"
            >
              <BookPlus
                className="size-6 text-brand-yellow"
                aria-hidden="true"
              />
              Zgłoszone przedmioty do akceptacji
            </h2>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError(null);
                void fetchRequests()
                  .catch((requestError: unknown) =>
                    setError(
                      getErrorMessage(
                        requestError,
                        "Nie udało się pobrać zgłoszeń.",
                      ),
                    ),
                  )
                  .finally(() => setLoading(false));
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
          </div>

          {loading ? (
            <p role="status" className="py-6 text-brand-textMuted">
              Ładowanie zgłoszeń…
            </p>
          ) : requests.length === 0 ? (
            <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-brand-textMuted">
              Brak oczekujących zgłoszeń przedmiotów.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-brand-cardBorder bg-brand-card">
              <table className="w-full min-w-[700px] text-left text-sm text-white">
                <thead className="border-b border-brand-cardBorder bg-brand-black text-xs uppercase text-brand-textMuted">
                  <tr>
                    <th className="px-5 py-4">Przedmiot</th>
                    <th className="px-5 py-4">Korepetytor</th>
                    <th className="px-5 py-4">Opis</th>
                    <th className="px-5 py-4 text-right">Decyzja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-cardBorder">
                  {requests.map((request) => (
                    <tr
                      key={request.id_subject_requests}
                      className="align-top hover:bg-brand-black/40"
                    >
                      <td className="px-5 py-4 font-semibold text-brand-yellow">
                        {request.subject_name}
                      </td>
                      <td className="px-5 py-4">
                        {request.tutor.first_name} {request.tutor.last_name}
                      </td>
                      <td className="px-5 py-4 text-brand-textMuted">
                        {request.description || "Brak opisu"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleReview(
                                request.id_subject_requests,
                                "APPROVED",
                              )
                            }
                            disabled={reviewingId !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-500/15 px-3 py-2 text-xs font-medium text-green-300 transition hover:bg-green-500 hover:text-black disabled:opacity-50"
                          >
                            <CheckCircle2 size={15} aria-hidden="true" />
                            Akceptuj
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleReview(
                                request.id_subject_requests,
                                "REJECTED",
                              )
                            }
                            disabled={reviewingId !== null}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-500 hover:text-black disabled:opacity-50"
                          >
                            <XCircle size={15} aria-hidden="true" />
                            Odrzuć
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
