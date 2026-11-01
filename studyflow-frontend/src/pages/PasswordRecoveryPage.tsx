import axios from "axios";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

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
  return "Nie udało się wysłać prośby o zmianę hasła.";
}

export function PasswordRecoveryPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const { data } = await api.post<{ message: string }>(
        "/auth/request-password-reset",
        { email },
      );
      setMessage(data.message);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-black px-4 py-10 text-white">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-brand-cardBorder bg-brand-card p-7 shadow-2xl sm:p-9">
        <div className="text-center">
          <KeyRound className="mx-auto size-10 text-brand-yellow" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold">Odzyskiwanie hasła</h1>
          <p className="mt-2 text-sm text-brand-textMuted">
            Podaj adres e-mail powiązany z kontem. Wyślemy link do ustawienia nowego hasła.
          </p>
        </div>
        {message && (
          <p role="status" className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="recovery-email" className="block text-sm text-brand-textMuted">
            Adres e-mail
          </label>
          <div className="flex items-center gap-2 rounded-lg border border-brand-cardBorder bg-brand-black px-3">
            <Mail className="size-4 text-brand-yellow" aria-hidden="true" />
            <input
              id="recovery-email"
              type="email"
              autoComplete="email"
              required
              maxLength={100}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 text-white outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-yellow py-3 font-semibold text-brand-black disabled:opacity-50"
          >
            {submitting ? "Wysyłanie…" : "Wyślij link"}
          </button>
        </form>
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-brand-yellow hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Wróć do logowania
        </Link>
      </section>
    </main>
  );
}
