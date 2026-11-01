import { Bell, BookOpen, Check, LogOut, Menu, X } from "lucide-react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
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

interface UserNotification {
  id_notifications: number;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
}

const ROLE_LINKS: Record<string, RoleLink[]> = {
  student: [
    { key: "my-bookings", label: "Harmonogram" },
    { key: "available", label: "Wolne lekcje" },
    { key: "find-tutors", label: "Szukaj korepetytora" },
    { key: "my-tutors", label: "Korepetytorzy" },
    { key: "stats", label: "Oceny i statystyki" },
  ],
  tutor: [
    { key: "my-bookings", label: "Harmonogram" },
    { key: "available", label: "Wystaw termin" },
    { key: "tutor-students", label: "Uczniowie" },
    { key: "tutor-availability", label: "Dostępność" },
    { key: "subject-requests", label: "Zgłoś przedmiot" },
  ],
  admin: [
    { key: "my-bookings", label: "Harmonogram" },
    { key: "admin-metrics", label: "Dashboard" },
    { key: "users", label: "Użytkownicy" },
    { key: "admin-subjects", label: "Przedmioty" },
    { key: "subject-requests", label: "Zgłoszenia" },
    { key: "reports", label: "Raporty finansowe" },
  ],
};

export function Navbar({ activeTab, setActiveTab }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [notificationOwnerId, setNotificationOwnerId] = useState<number | null>(
    null,
  );
  const [notificationError, setNotificationError] = useState<string | null>(
    null,
  );
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const roleLinks = user ? (ROLE_LINKS[user.role] ?? []) : [];
  const visibleNotifications =
    notificationOwnerId === user?.id ? notifications : [];
  const unreadCount = visibleNotifications.filter(
    (notification) => notification.read_at === null,
  ).length;
  const userId = user?.id;

  useEffect(() => {
    function handleOutsidePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (notificationsRef.current?.contains(target)) return;
      if (profileRef.current?.contains(target)) return;

      setNotificationsOpen(false);
      setProfileMenuOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (userId === undefined) return;

    let cancelled = false;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get<UserNotification[]>("/notifications");
        if (!cancelled) {
          setNotifications(data);
          setNotificationOwnerId(userId);
          setNotificationError(null);
        }
      } catch {
        if (!cancelled) {
          setNotificationError("Nie udało się pobrać powiadomień.");
        }
      }
    };
    void fetchNotifications();
    const intervalId = window.setInterval(() => {
      void fetchNotifications();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [userId]);

  async function markNotificationRead(notificationId: number) {
    setNotificationError(null);
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id_notifications === notificationId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
      );
    } catch {
      setNotificationError("Nie udało się oznaczyć powiadomienia jako przeczytane.");
    }
  }

  async function markAllNotificationsRead() {
    setNotificationError(null);
    try {
      await api.patch("/notifications/read-all");
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at ?? readAt,
        })),
      );
    } catch {
      setNotificationError("Nie udało się oznaczyć powiadomień jako przeczytane.");
    }
  }

  async function handleLogout() {
    setMobileMenuOpen(false);
    try {
      await api.post("/auth/logout");
    } catch (error: unknown) {
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      const warning =
        message ??
        "Sesja lokalna została zakończona, ale serwer nie potwierdził unieważnienia tokenu.";
      sessionStorage.setItem("logoutWarning", warning);
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  }

  function handleTabClick(tab: string) {
    setActiveTab?.(tab);
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setProfileMenuOpen(false);
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
            setNotificationsOpen(false);
            setProfileMenuOpen(false);
            setActiveTab?.("my-bookings");
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
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen((open) => !open);
                    setProfileMenuOpen(false);
                  }}
                  aria-label={`Powiadomienia${unreadCount ? `, nieprzeczytane: ${unreadCount}` : ""}`}
                  aria-expanded={notificationsOpen}
                  className="relative rounded-lg p-2 text-brand-textMuted transition hover:bg-brand-black hover:text-brand-yellow focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-yellow"
                >
                  <Bell className="size-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-brand-yellow px-1 text-[10px] font-bold text-brand-black">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-brand-cardBorder bg-brand-card p-4 shadow-2xl"
                    aria-label="Powiadomienia"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-bold text-white">Powiadomienia</h2>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void markAllNotificationsRead()}
                          className="text-xs font-medium text-brand-yellow hover:underline"
                        >
                          Oznacz wszystkie jako przeczytane
                        </button>
                      )}
                    </div>
                    {notificationError && (
                      <p role="alert" className="mt-3 text-xs text-red-300">
                        {notificationError}
                      </p>
                    )}
                    {visibleNotifications.length === 0 ? (
                      <p className="py-6 text-center text-sm text-brand-textMuted">
                        Brak powiadomień.
                      </p>
                    ) : (
                      <ul className="mt-3 max-h-[60vh] space-y-2 overflow-y-auto">
                        {visibleNotifications.map((notification) => (
                          <li
                            key={notification.id_notifications}
                            className={`rounded-lg border p-3 ${
                              notification.read_at
                                ? "border-brand-cardBorder bg-brand-black/40"
                                : "border-brand-yellow/40 bg-brand-yellow/5"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {notification.title}
                                </p>
                                <p className="mt-1 text-xs leading-5 text-brand-textMuted">
                                  {notification.message}
                                </p>
                                <time
                                  dateTime={notification.created_at}
                                  className="mt-2 block text-xs text-brand-textMuted"
                                >
                                  {new Date(
                                    notification.created_at,
                                  ).toLocaleString("pl-PL")}
                                </time>
                              </div>
                              {!notification.read_at && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void markNotificationRead(
                                      notification.id_notifications,
                                    )
                                  }
                                  aria-label="Oznacz jako przeczytane"
                                  className="shrink-0 rounded p-1 text-brand-yellow hover:bg-brand-yellow/10"
                                >
                                  <Check className="size-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen((open) => !open);
                    setNotificationsOpen(false);
                  }}
                  aria-label="Otwórz dane profilu"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  className="grid size-9 place-items-center rounded-full border border-brand-yellow bg-brand-yellow/10 text-sm font-bold text-brand-yellow transition hover:bg-brand-yellow/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-yellow"
                >
                  {user.first_name.charAt(0)}
                </button>
                {profileMenuOpen && (
                  <div
                    role="menu"
                    aria-label="Profil użytkownika"
                    className="absolute right-0 top-full z-50 mt-3 w-72 rounded-xl border border-brand-cardBorder bg-brand-card p-4 shadow-2xl"
                  >
                    <p className="font-semibold text-white">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="mt-1 break-all text-sm text-brand-textMuted">
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs capitalize text-brand-yellow">
                      {user.role}
                    </p>
                    {user.role === "tutor" && setActiveTab && (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          handleTabClick("tutor-profile");
                          setProfileMenuOpen(false);
                        }}
                        className="mt-4 w-full rounded-lg border border-brand-cardBorder px-3 py-2 text-left text-sm font-semibold text-white transition hover:border-brand-yellow hover:text-brand-yellow"
                      >
                        Zobacz i edytuj profil
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleLogout()}
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
