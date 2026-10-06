import { BookOpen, LogOut, Menu, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/useAuth";

interface NavbarProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

interface RoleLink {
  key: string;
  label: string;
  activeWhen?: string[];
}

const ROLE_LINKS: Record<string, RoleLink[]> = {
  student: [
    { key: "available", label: "Wolne lekcje" },
    { key: "find-tutors", label: "Szukaj korepetytora" },
    { key: "my-bookings", label: "Harmonogram" },
    { key: "my-tutors", label: "Korepetytorzy" },
    { key: "stats", label: "Oceny i statystyki" },
  ],
  tutor: [
    { key: "available", label: "Wystaw termin" },
    { key: "my-bookings", label: "Harmonogram" },
    { key: "tutor-students", label: "Uczniowie" },
    { key: "tutor-profile", label: "Dane", activeWhen: ["tutor-profile"] },
    { key: "tutor-availability", label: "Dostępność" },
    { key: "subject-requests", label: "Zgłoś przedmiot" },
  ],
  admin: [
    { key: "admin-metrics", label: "Dashboard" },
    { key: "users", label: "Użytkownicy" },
    { key: "my-bookings", label: "Harmonogram" },
    { key: "admin-subjects", label: "Przedmioty" },
    { key: "subject-requests", label: "Zgłoszenia" },
    { key: "reports", label: "Raporty finansowe" },
  ],
};

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const roleLinks = user ? (ROLE_LINKS[user.role] ?? []) : [];

  function handleLogout() {
    setMobileMenuOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  function handleTabClick(tab: string) {
    setActiveTab?.(tab);
    setMobileMenuOpen(false);
  }

  function isActiveLink(key: string, activeWhen?: string[]) {
    return (activeWhen ?? [key]).includes(activeTab ?? "");
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-brand-cardBorder bg-brand-card px-4 py-4 shadow-xl sm:px-6 sm:py-5 lg:px-10">
      <div className="flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Link
          to={user ? "/dashboard" : "/"}
          className="flex shrink-0 items-center gap-3"
          onClick={() => {
            setMobileMenuOpen(false);
            setActiveTab?.("available");
          }}
          aria-label="StudyFlow — strona główna"
        >
          <BookOpen className="size-9 text-brand-yellow" aria-hidden="true" />
          <span className="text-2xl font-extrabold tracking-wide text-white sm:text-3xl">
            Study<span className="text-brand-yellow">Flow</span>
          </span>
        </Link>

        {user && setActiveTab && roleLinks.length > 0 && (
          <nav className="hidden lg:block" aria-label="Nawigacja główna">
            <ul className="flex items-center gap-3 text-sm font-semibold xl:gap-5 xl:text-base">
              {roleLinks.map(({ key, label, activeWhen }) => {
                const isActive = isActiveLink(key, activeWhen);
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => handleTabClick(key)}
                      aria-current={isActive ? "page" : undefined}
                      className={`whitespace-nowrap border-b-2 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-yellow ${
                        isActive
                          ? "border-brand-yellow font-bold text-brand-yellow"
                          : "border-transparent text-brand-textMuted hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-right sm:block">
                <span className="block text-base font-bold text-white">
                  {user.first_name} {user.last_name}
                </span>
                <span className="text-xs capitalize text-brand-textMuted">
                  {user.role}
                </span>
              </span>
              <span
                className="grid size-9 place-items-center rounded-full border border-brand-yellow bg-brand-yellow/10 text-sm font-bold text-brand-yellow"
                aria-hidden="true"
              >
                {user.first_name.charAt(0)}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                title="Wyloguj się"
                aria-label="Wyloguj się"
                className="rounded-lg p-2 text-brand-textMuted transition hover:bg-red-500/10 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
              {setActiveTab && roleLinks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  aria-label={mobileMenuOpen ? "Zamknij menu" : "Otwórz menu"}
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-role-navigation"
                  className="rounded-lg p-2 text-brand-yellow transition hover:bg-brand-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow lg:hidden"
                >
                  {mobileMenuOpen ? (
                    <X className="size-6" aria-hidden="true" />
                  ) : (
                    <Menu className="size-6" aria-hidden="true" />
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="rounded-xl border border-brand-cardBorder px-3 py-2 text-sm font-medium text-white transition hover:border-brand-yellow sm:px-4"
              >
                Logowanie
              </Link>
              <Link
                to="/register"
                className="rounded-xl bg-brand-yellow px-3 py-2 text-sm font-semibold text-brand-black shadow-lg shadow-brand-yellow/10 transition hover:bg-brand-yellowHover sm:px-4"
              >
                Rejestracja
              </Link>
            </div>
          )}
        </div>
      </div>
      {user && setActiveTab && mobileMenuOpen && roleLinks.length > 0 && (
        <nav
          id="mobile-role-navigation"
          className="mt-3 w-full border-t border-brand-cardBorder pt-3 lg:hidden"
          aria-label="Nawigacja mobilna"
        >
          <ul className="flex flex-col gap-2">
            {roleLinks.map(({ key, label, activeWhen }) => {
              const isActive = isActiveLink(key, activeWhen);
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => handleTabClick(key)}
                    aria-current={isActive ? "page" : undefined}
                    className={`w-full rounded-lg px-4 py-3 text-left text-base font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow ${
                      isActive
                        ? "bg-brand-yellow/10 font-semibold text-brand-yellow"
                        : "text-white hover:bg-brand-black"
                    }`}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
