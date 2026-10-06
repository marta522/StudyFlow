import {
  ArrowRight,
  Award,
  BookOpen,
  Clock3,
  LogIn,
  ShieldCheck,
  Star,
  UserPlus,
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: ShieldCheck,
    title: "Spersonalizowana nauka",
    description: "Znajdź korepetytora i przedmiot dopasowany do Twoich celów.",
  },
  {
    icon: Clock3,
    title: "Elastyczne terminy",
    description: "Wybieraj spośród dostępnych lekcji i rezerwuj dogodny czas.",
  },
  {
    icon: BookOpen,
    title: "Różne przedmioty",
    description: "Przeglądaj ofertę przedmiotów i zgłaszaj nowe obszary nauki.",
  },
  {
    icon: Award,
    title: "Postępy w jednym miejscu",
    description:
      "Śledź oceny i informacje o nauce na swoim osobistym pulpicie.",
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-brand-black text-white">
      <header className="sticky top-0 z-50 border-b border-brand-cardBorder bg-brand-black/90 px-5 py-4 backdrop-blur-md sm:px-8">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between gap-4"
          aria-label="Nawigacja główna"
        >
          <Link to="/" className="flex items-center gap-3">
            <BookOpen className="size-9 text-brand-yellow" aria-hidden="true" />
            <span className="text-2xl font-bold tracking-wide">
              Study<span className="text-brand-yellow">Flow</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-brand-cardBorder px-3 py-2.5 text-sm font-medium transition hover:border-brand-yellow sm:px-5"
            >
              <LogIn className="size-4 text-brand-yellow" aria-hidden="true" />
              Logowanie
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-yellow px-3 py-2.5 text-sm font-semibold text-brand-black shadow-lg shadow-brand-yellow/10 transition hover:bg-brand-yellowHover sm:px-5"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              Rejestracja
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-6xl flex-col items-center space-y-6 px-5 py-20 text-center sm:px-8 lg:py-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-yellow/30 bg-brand-yellow/10 px-4 py-2 text-sm font-medium text-brand-yellow">
            <Star className="size-4 fill-brand-yellow" aria-hidden="true" />
            Platforma korepetycji i rozwoju
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Znajdź idealnego{" "}
            <span className="text-brand-yellow">korepetytora</span> dla siebie
          </h1>
          <p className="max-w-2xl text-lg font-normal leading-8 text-brand-textMuted md:text-xl">
            Odkrywaj przedmioty, rezerwuj dogodną porę lekcji i rozwijaj swoje
            umiejętności we własnym tempie.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-3 rounded-xl bg-brand-yellow px-8 py-4 text-lg font-bold text-brand-black shadow-xl shadow-brand-yellow/15 transition hover:bg-brand-yellowHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow"
          >
            Rozpocznij naukę
            <ArrowRight className="size-5" aria-hidden="true" />
          </Link>
          <Link
            to="/tutors"
            className="text-sm font-medium text-brand-yellow underline-offset-4 hover:underline"
          >
            Przeglądaj korepetytorów bez logowania
          </Link>
        </section>

        <section className="mx-auto max-w-7xl space-y-10 px-5 py-16 sm:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-yellow">
              StudyFlow
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Nauka zorganizowana wokół Ciebie
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {features.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="space-y-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 transition hover:border-brand-yellow/50"
              >
                <Icon
                  className="size-10 text-brand-yellow"
                  aria-hidden="true"
                />
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-sm leading-6 text-brand-textMuted">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-brand-cardBorder px-5 py-6 text-center text-sm text-brand-textMuted">
        © 2026 StudyFlow — platforma korepetycji
      </footer>
    </div>
  );
}
