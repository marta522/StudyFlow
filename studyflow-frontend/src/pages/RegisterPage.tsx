import axios from "axios";
import { BookOpen, UserPlus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import type { User } from "../context/auth-context";
import { useAuth } from "../context/useAuth";

interface RegisterResponse {
  access_token: string;
  user: User;
}

interface ApiError {
  message?: string | string[];
}

function getRegisterError(error: unknown): string {
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

  return "Nie udało się utworzyć konta. Spróbuj ponownie.";
}

export function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { data } = await api.post<RegisterResponse>("/auth/register", {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        phone: phone || undefined,
        role_id: Number(roleId),
      });

      login(data.access_token, data.user);
      navigate("/dashboard", { replace: true });
    } catch (requestError: unknown) {
      setError(getRegisterError(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-black px-4 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-brand-cardBorder bg-brand-card p-7 shadow-2xl shadow-black/40 sm:p-9">
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-3"
          aria-label="StudyFlow"
        >
          <BookOpen className="size-10 text-brand-yellow" aria-hidden="true" />
          <span className="text-3xl font-bold tracking-wide">
            Study<span className="text-brand-yellow">Flow</span>
          </span>
        </Link>

        <h1 className="text-center text-xl font-semibold">
          Dołącz do platformy
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-brand-textMuted">
          Utwórz konto, aby rozpocząć naukę lub prowadzić zajęcia.
        </p>

        {error && (
          <div
            className="mt-6 rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-center text-sm text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="mb-1 block text-xs font-medium text-brand-textMuted"
              >
                Imię
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-brand-textMuted/60 focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
                placeholder="Jan"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="mb-1 block text-xs font-medium text-brand-textMuted"
              >
                Nazwisko
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-brand-textMuted/60 focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
                placeholder="Kowalski"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="registerEmail"
              className="mb-1 block text-xs font-medium text-brand-textMuted"
            >
              Email
            </label>
            <input
              id="registerEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-brand-textMuted/60 focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
              placeholder="jan@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="registerPassword"
              className="mb-1 block text-xs font-medium text-brand-textMuted"
            >
              Hasło (minimum 6 znaków)
            </label>
            <input
              id="registerPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-brand-textMuted/60 focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
              placeholder="Wpisz hasło"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-xs font-medium text-brand-textMuted"
            >
              Telefon <span className="font-normal">(opcjonalnie)</span>
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-brand-textMuted/60 focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
              placeholder="Numer telefonu"
            />
          </div>

          <div>
            <label
              htmlFor="roleId"
              className="mb-1 block text-xs font-medium text-brand-textMuted"
            >
              Rola w systemie
            </label>
            <select
              id="roleId"
              value={roleId}
              onChange={(event) => setRoleId(Number(event.target.value))}
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-yellow focus:ring-2 focus:ring-brand-yellow/20"
            >
              <option value={2}>Uczeń / Student</option>
              <option value={3}>Korepetytor / Nauczyciel</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow py-3 font-semibold text-brand-black shadow-lg shadow-brand-yellow/10 transition hover:bg-brand-yellowHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow disabled:cursor-wait disabled:opacity-60"
          >
            <UserPlus className="size-5" aria-hidden="true" />
            {submitting ? "Tworzenie konta…" : "Zarejestruj się"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-textMuted">
          Masz już konto?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-yellow hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </section>
    </main>
  );
}
