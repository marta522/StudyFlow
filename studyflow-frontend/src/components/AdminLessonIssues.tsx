import axios from "axios";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface LessonIssue {
  id_lesson_issues: number;
  title: string;
  description: string;
  status: IssueStatus;
  admin_note: string | null;
  created_at: string;
  reporter: {
    first_name: string;
    last_name: string;
    email: string;
    role: { name: string };
  };
  resolver: { first_name: string; last_name: string } | null;
  lesson: {
    lesson_date: string;
    start_time: string;
    end_time: string;
    subject: { name: string };
    tutor: { first_name: string; last_name: string };
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
    if (!error.response) return "Nie można połączyć się z serwerem.";
  }
  return "Nie udało się obsłużyć zgłoszeń.";
}

const statusNames: Record<IssueStatus, string> = {
  OPEN: "Otwarte",
  IN_PROGRESS: "W trakcie",
  RESOLVED: "Rozwiązane",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString("pl-PL");
}

export function AdminLessonIssues() {
  const [issues, setIssues] = useState<LessonIssue[]>([]);
  const [statusFilter, setStatusFilter] = useState<"ALL" | IssueStatus>("ALL");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [statuses, setStatuses] = useState<Record<number, IssueStatus>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyIssues = useCallback((data: LessonIssue[]) => {
    setIssues(data);
    setNotes((previous) => ({
      ...previous,
      ...Object.fromEntries(
        data.map((issue) => [issue.id_lesson_issues, issue.admin_note ?? ""]),
      ),
    }));
    setStatuses((previous) => ({
      ...previous,
      ...Object.fromEntries(
        data.map((issue) => [issue.id_lesson_issues, issue.status]),
      ),
    }));
  }, []);

  const fetchIssues = useCallback(async () => {
    const { data } = await api.get<LessonIssue[]>("/lesson-issues/admin", {
      params: statusFilter === "ALL" ? undefined : { status: statusFilter },
    });
    return data;
  }, [statusFilter]);

  const reloadIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      applyIssues(await fetchIssues());
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [applyIssues, fetchIssues]);

  useEffect(() => {
    let cancelled = false;
    void fetchIssues()
      .then((data) => {
        if (!cancelled) applyIssues(data);
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
  }, [applyIssues, fetchIssues]);

  async function updateIssue(issue: LessonIssue) {
    const status = statuses[issue.id_lesson_issues] ?? issue.status;
    setSavingId(issue.id_lesson_issues);
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/lesson-issues/admin/${issue.id_lesson_issues}`, {
        status,
        admin_note: notes[issue.id_lesson_issues] ?? "",
      });
      setSuccess(`Zaktualizowano zgłoszenie „${issue.title}”.`);
      await reloadIssues();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="lesson-issues-title">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="lesson-issues-title"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <AlertCircle className="size-6 text-brand-yellow" aria-hidden="true" />
            Zgłoszenia problemów z lekcjami
          </h2>
          <p className="mt-1 text-sm text-brand-textMuted">
            Przeglądaj zgłoszenia i informuj zgłaszających o postępach.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-brand-textMuted">
            Status
            <select
              value={statusFilter}
              onChange={(event) => {
                setLoading(true);
                setError(null);
                setStatusFilter(event.target.value as "ALL" | IssueStatus);
              }}
              className="ml-2 rounded-lg border border-brand-cardBorder bg-brand-card px-3 py-2 text-white"
            >
              <option value="ALL">Wszystkie</option>
              <option value="OPEN">Otwarte</option>
              <option value="IN_PROGRESS">W trakcie</option>
              <option value="RESOLVED">Rozwiązane</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              void reloadIssues();
            }}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-textMuted hover:border-brand-yellow disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Odśwież
          </button>
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="rounded-lg bg-green-500/10 p-3 text-sm text-green-200">
          {success}
        </p>
      )}
      {loading ? (
        <p role="status" className="py-8 text-center text-brand-textMuted">
          Ładowanie zgłoszeń…
        </p>
      ) : issues.length === 0 ? (
        <p className="rounded-xl border border-brand-cardBorder bg-brand-card p-6 text-brand-textMuted">
          Brak zgłoszeń dla wybranego statusu.
        </p>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <article
              key={issue.id_lesson_issues}
              className="space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-brand-yellow">
                    {issue.lesson.subject.name} ·{" "}
                    {formatDate(issue.lesson.lesson_date)}{" "}
                    {issue.lesson.start_time}–{issue.lesson.end_time}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">{issue.title}</h3>
                </div>
                <span className="rounded-full border border-brand-cardBorder px-3 py-1 text-xs">
                  {statusNames[issue.status]}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-brand-textMuted">
                {issue.description}
              </p>
              <p className="text-xs text-brand-textMuted">
                Zgłosił(a): {issue.reporter.first_name}{" "}
                {issue.reporter.last_name} ({issue.reporter.role.name}) ·{" "}
                {issue.reporter.email} · {formatDate(issue.created_at)}
              </p>
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                <label className="space-y-1 text-sm text-brand-textMuted">
                  Notatka dla zgłaszającego
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={notes[issue.id_lesson_issues] ?? ""}
                    onChange={(event) =>
                      setNotes((previous) => ({
                        ...previous,
                        [issue.id_lesson_issues]: event.target.value,
                      }))
                    }
                    className="w-full resize-y rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                  />
                </label>
                <label className="space-y-1 text-sm text-brand-textMuted">
                  Zmień status
                  <select
                    value={statuses[issue.id_lesson_issues] ?? issue.status}
                    onChange={(event) =>
                      setStatuses((previous) => ({
                        ...previous,
                        [issue.id_lesson_issues]: event.target.value as IssueStatus,
                      }))
                    }
                    className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                  >
                    {Object.entries(statusNames).map(([value, name]) => (
                      <option key={value} value={value}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {issue.resolver && issue.status === "RESOLVED" && (
                <p className="text-xs text-brand-textMuted">
                  Rozpatrzył(a): {issue.resolver.first_name}{" "}
                  {issue.resolver.last_name}
                </p>
              )}
              <button
                type="button"
                onClick={() => void updateIssue(issue)}
                disabled={savingId === issue.id_lesson_issues}
                className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-black disabled:opacity-50"
              >
                {savingId === issue.id_lesson_issues
                  ? "Zapisywanie…"
                  : "Zapisz zmianę"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
