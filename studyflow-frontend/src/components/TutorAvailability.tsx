import axios from "axios";
import { Clock3, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";

interface AvailabilitySlot {
  id_availability: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface ApiError {
  message?: string | string[];
}

const DAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) return "Nie można połączyć się z serwerem.";
  }
  return "Nie udało się wykonać operacji.";
}

export function TutorAvailability() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [day, setDay] = useState(DAYS[0]);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadSlots() {
    const { data } = await api.get<AvailabilitySlot[]>(
      "/tutors/me/availability",
    );
    setSlots(data);
  }

  useEffect(() => {
    let cancelled = false;
    void api
      .get<AvailabilitySlot[]>("/tutors/me/availability")
      .then(({ data }) => {
        if (!cancelled) setSlots(data);
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

  async function handleAddSlot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await api.post("/tutors/me/availability", {
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
      });
      await loadSlots();
      setNotice("Dodano termin dostępności.");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveSlot(slotId: number) {
    setRemovingId(slotId);
    setError(null);
    setNotice(null);
    try {
      await api.delete(`/tutors/me/availability/${slotId}`);
      setSlots((current) =>
        current.filter((slot) => slot.id_availability !== slotId),
      );
      setNotice("Usunięto termin dostępności.");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="availability-heading">
      <div className="rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
        <h2
          id="availability-heading"
          className="mb-2 flex items-center gap-2 text-xl font-bold text-brand-yellow"
        >
          <Clock3 className="size-6" aria-hidden="true" />
          Zarządzanie dostępnością
        </h2>
        <p className="mb-6 text-sm text-brand-textMuted">
          Zdefiniuj cykliczne okna swojej dostępności. Konkretne terminy do
          rezerwacji wystawisz w zakładce „Dostępne lekcje”.
        </p>
        <form
          onSubmit={(event) => void handleAddSlot(event)}
          className="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <label className="text-xs text-brand-textMuted">
            Dzień tygodnia
            <select
              value={day}
              onChange={(event) => setDay(event.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
            >
              {DAYS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-brand-textMuted">
            Godzina od
            <input
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="text-xs text-brand-textMuted">
            Godzina do
            <input
              type="time"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="mt-1 w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow py-2 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden="true" />
              {submitting ? "Dodawanie…" : "Dodaj termin"}
            </button>
          </div>
        </form>
      </div>
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
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Zdefiniowane terminy</h3>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setError(null);
              void loadSlots()
                .catch((requestError: unknown) =>
                  setError(getErrorMessage(requestError)),
                )
                .finally(() => setLoading(false));
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-textMuted hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Odśwież
          </button>
        </div>
        {loading ? (
          <p role="status" className="py-6 text-center text-brand-textMuted">
            Ładowanie terminów…
          </p>
        ) : slots.length === 0 ? (
          <p className="rounded-xl border border-brand-cardBorder bg-brand-card p-5 text-brand-textMuted">
            Nie dodano jeszcze terminów dostępności.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => (
              <article
                key={slot.id_availability}
                className="flex items-center justify-between rounded-xl border border-brand-cardBorder bg-brand-card p-4"
              >
                <div>
                  <h4 className="font-bold text-brand-yellow">
                    {slot.day_of_week}
                  </h4>
                  <p className="text-sm text-brand-textMuted">
                    {slot.start_time}–{slot.end_time}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Usuń termin ${slot.day_of_week} ${slot.start_time}`}
                  disabled={removingId === slot.id_availability}
                  onClick={() => void handleRemoveSlot(slot.id_availability)}
                  className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
