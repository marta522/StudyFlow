import axios from "axios";
import { KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  return "Nie udało się zmienić hasła.";
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Podane hasła nie są takie same.");
      return;
    }
    if (!token) {
      setError("Link resetujący nie zawiera prawidłowego tokenu.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", {
        token,
        newPassword: password,
      });
      navigate("/login?passwordReset=success", { replace: true });
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
          <h1 className="mt-4 text-2xl font-bold">Ustaw nowe hasło</h1>
          <p className="mt-2 text-sm text-brand-textMuted">
            Hasło musi mieć co najmniej 8 znaków oraz zawierać małą i wielką literę oraz cyfrę.
          </p>
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2 text-sm text-brand-textMuted">
            Nowe hasło
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+"
              title="Hasło musi zawierać małą i wielką literę oraz cyfrę."
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-3 text-white"
            />
          </label>
          <label className="block space-y-2 text-sm text-brand-textMuted">
            Powtórz hasło
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-3 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-yellow py-3 font-semibold text-brand-black disabled:opacity-50"
          >
            {submitting ? "Zapisywanie…" : "Zmień hasło"}
          </button>
        </form>
        <Link to="/login" className="block text-center text-sm text-brand-yellow hover:underline">
          Wróć do logowania
        </Link>
      </section>
    </main>
  );
}
