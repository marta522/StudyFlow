import axios from "axios";
import {
  BookOpen,
  Check,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";

interface SubjectItem {
  id_subjects: number;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  _count: { tutor_subjects: number; lessons: number };
}

interface ApiError {
  message?: string | string[];
}

interface AdminSubjectsProps {
  onGoToRequests: () => void;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) return "Nie można połączyć się z serwerem.";
  }
  return "Nie udało się wykonać operacji na przedmiocie.";
}

export function AdminSubjects({ onGoToRequests }: AdminSubjectsProps) {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<SubjectItem | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const loadSubjects = useCallback(async () => {
    const { data } = await api.get<SubjectItem[]>("/subjects/admin");
    setSubjects(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<SubjectItem[]>("/subjects/admin")
      .then(({ data }) => {
        if (!cancelled) setSubjects(data);
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

  function openCreateForm() {
    setEditing(null);
    setCreateDialogOpen(true);
    setName("");
    setDescription("");
    setError(null);
  }

  function openEditForm(subject: SubjectItem) {
    setCreateDialogOpen(false);
    setEditing(subject);
    setName(subject.name);
    setDescription(subject.description ?? "");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (editing) {
        await api.patch(`/subjects/${editing.id_subjects}`, {
          name: name.trim(),
          description: description.trim() || null,
        });
        setNotice(`Zaktualizowano przedmiot „${name.trim()}”.`);
      } else {
        await api.post("/subjects", {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        setNotice(`Dodano przedmiot „${name.trim()}”.`);
      }
      setEditing(null);
      setCreateDialogOpen(false);
      await loadSubjects();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(subject: SubjectItem) {
    const activating = subject.status === "INACTIVE";
    if (
      !activating &&
      !window.confirm(
        `Dezaktywować przedmiot „${subject.name}”? Zachowane lekcje i oceny nie zostaną usunięte.`,
      )
    ) {
      return;
    }

    setChangingId(subject.id_subjects);
    setError(null);
    setNotice(null);
    try {
      await api.patch(`/subjects/${subject.id_subjects}`, {
        status: activating ? "ACTIVE" : "INACTIVE",
      });
      await loadSubjects();
      setNotice(
        activating
          ? `Aktywowano przedmiot „${subject.name}”.`
          : `Dezaktywowano przedmiot „${subject.name}”.`,
      );
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setChangingId(null);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="admin-subjects-heading">
      <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 md:flex-row md:items-center">
        <div>
          <h2
            id="admin-subjects-heading"
            className="flex items-center gap-2 text-xl font-bold"
          >
            <BookOpen className="size-6 text-brand-yellow" aria-hidden="true" />
            Baza przedmiotów
          </h2>
          <p className="mt-1 text-sm text-brand-textMuted">
            Dodawaj, edytuj, aktywuj i dezaktywuj przedmioty dostępne w
            systemie.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onGoToRequests}
            className="rounded-lg border border-brand-cardBorder px-4 py-2 text-sm text-white transition hover:border-brand-yellow"
          >
            Zgłoszone przedmioty
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover"
          >
            <Plus className="size-4" aria-hidden="true" />
            Dodaj przedmiot
          </button>
        </div>
      </header>
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
      <div className="flex justify-end">
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setError(null);
            void loadSubjects()
              .catch((requestError: unknown) =>
                setError(getErrorMessage(requestError)),
              )
              .finally(() => setLoading(false));
          }}
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
        <p role="status" className="py-8 text-center text-brand-textMuted">
          Ładowanie przedmiotów…
        </p>
      ) : subjects.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
          Baza przedmiotów jest pusta.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-cardBorder bg-brand-card">
          <table className="w-full text-left text-sm text-white">
            <thead className="border-b border-brand-cardBorder bg-brand-black text-xs uppercase text-brand-textMuted">
              <tr>
                <th className="px-5 py-4">Przedmiot</th>
                <th className="px-5 py-4">Opis</th>
                <th className="px-5 py-4">Wykorzystanie</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Działania</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cardBorder">
              {subjects.map((subject) => (
                <tr
                  key={subject.id_subjects}
                  className="hover:bg-brand-black/40"
                >
                  <td className="px-5 py-4 font-bold text-brand-yellow">
                    {subject.name}
                  </td>
                  <td className="max-w-md px-5 py-4 text-xs text-brand-textMuted">
                    {subject.description || "Brak opisu."}
                  </td>
                  <td className="px-5 py-4 text-xs text-brand-textMuted">
                    {subject._count.tutor_subjects} korepetytorów ·{" "}
                    {subject._count.lessons} lekcji
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${subject.status === "ACTIVE" ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-gray-500/30 bg-gray-500/10 text-gray-400"}`}
                    >
                      {subject.status === "ACTIVE" ? "Aktywny" : "Nieaktywny"}
                    </span>
                  </td>
                  <td className="space-x-1 px-5 py-4 text-right">
                    <button
                      type="button"
                      aria-label={`Edytuj ${subject.name}`}
                      onClick={() => openEditForm(subject)}
                      className="rounded-lg p-2 text-brand-yellow transition hover:bg-brand-yellow/10"
                    >
                      <Edit2 className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${subject.status === "ACTIVE" ? "Dezaktywuj" : "Aktywuj"} ${subject.name}`}
                      disabled={changingId === subject.id_subjects}
                      onClick={() => void handleStatusChange(subject)}
                      className={`rounded-lg p-2 transition disabled:opacity-50 ${subject.status === "ACTIVE" ? "text-red-400 hover:bg-red-500/10" : "text-green-400 hover:bg-green-500/10"}`}
                    >
                      {subject.status === "ACTIVE" ? (
                        <Trash2 className="size-4" aria-hidden="true" />
                      ) : (
                        <Check className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(editing !== null || createDialogOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="subject-dialog-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6"
          >
            <div className="flex items-center justify-between border-b border-brand-cardBorder pb-3">
              <h3
                id="subject-dialog-title"
                className="text-lg font-bold text-brand-yellow"
              >
                {editing ? "Edytuj przedmiot" : "Dodaj przedmiot"}
              </h3>
              <button
                type="button"
                aria-label="Zamknij"
                onClick={() => {
                  setEditing(null);
                  setCreateDialogOpen(false);
                }}
                className="text-brand-textMuted hover:text-white"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-4"
            >
              <label className="block text-sm text-brand-textMuted">
                Nazwa przedmiotu
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm text-brand-textMuted">
                Opis
                <textarea
                  maxLength={5000}
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black p-3 text-white"
                />
              </label>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow py-2 font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
              >
                <Check className="size-4" aria-hidden="true" />
                {saving
                  ? "Zapisywanie…"
                  : editing
                    ? "Zapisz zmiany"
                    : "Dodaj do bazy"}
              </button>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}
