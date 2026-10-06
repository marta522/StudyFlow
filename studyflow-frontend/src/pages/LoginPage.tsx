import axios from "axios";
import { BookOpen, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import type { User } from "../context/auth-context";
import { useAuth } from "../context/useAuth";

interface LoginResponse {
  access_token: string;
  user: User;
}

interface ApiError {
  message?: string | string[];
}

function getLoginError(error: unknown): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (message) {
      return message;
    }
    if (!error.response) {
      return "Nie można połączyć się z serwerem. Sprawdź, czy backend działa.";
    }
  }

  return "Nie udało się zalogować. Spróbuj ponownie.";
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      login(data.access_token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (requestError: unknown) {
      setError(getLoginError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-black px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-brand-cardBorder bg-brand-card p-7 shadow-2xl shadow-black/40 sm:p-9">
        <a
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
          aria-label="StudyFlow"
        >
          <BookOpen className="size-10 text-brand-yellow" aria-hidden="true" />
          <span className="text-3xl font-bold tracking-wide">
            Study<span className="text-brand-yellow">Flow</span>
          </span>
        </a>

        <h1 className="text-center text-2xl font-semibold tracking-tight">
          Witaj ponownie
        </h1>
        <p className="mt-2 text-center text-sm text-brand-textMuted">
          Zaloguj się, aby kontynuować naukę.
        </p>

        {error && (
          <div
            className="mt-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center text-sm text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-brand-textMuted"
            >
              Adres email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-4 py-3 text-white outline-none transition placeholder:text-brand-textMuted/60 focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
              placeholder="np. jan.kowalski@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-brand-textMuted"
            >
              Hasło
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-4 py-3 text-white outline-none transition placeholder:text-brand-textMuted/60 focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
              placeholder="Wpisz swoje hasło"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow py-3 font-semibold text-brand-black shadow-lg shadow-brand-yellow/10 transition hover:bg-brand-yellowHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow disabled:cursor-wait disabled:opacity-60"
          >
            <LogIn className="size-5" aria-hidden="true" />
            {submitting ? "Logowanie…" : "Zaloguj się"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-textMuted">
          Nie masz jeszcze konta?{" "}
          <Link
            to="/register"
            className="font-medium text-brand-yellow hover:underline"
          >
            Zarejestruj się
          </Link>
        </p>
      </section>
    </main>
  );
}
