import axios from "axios";
import {
  Activity,
  Download,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Trash2,
  UserCheck,
  Users,
  UserX,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Fragment } from "react";
import api from "../api/axios";
import { useUsers, type UserItem, type UserRole, type UserStatus } from "../hooks/useUsers";
import { downloadCsv } from "../utils/csv";
import { formatDateOnly } from "../utils/date";

type RoleFilter = "all" | UserRole;

interface UserActivity {
  user: {
    created_at: string;
    bookings_as_student: {
      lesson: {
        id_lessons: number;
        lesson_date: string;
        start_time: string;
        end_time: string;
        status: string;
        subject: { name: string };
        tutor: { first_name: string; last_name: string };
      };
    }[];
    lessons_as_tutor: {
      id_lessons: number;
      lesson_date: string;
      start_time: string;
      end_time: string;
      status: string;
      subject: { name: string };
    }[];
  };
  bookingCount: number;
  tutoringLessonCount: number;
  reviewCount: number;
  gradeCount: number;
  auditEvents: {
    id_admin_audit_logs: number;
    action: string;
    entity_type: string;
    entity_id: number | null;
    details: string;
    created_at: string;
    actor: { first_name: string; last_name: string } | null;
  }[];
}

interface ApiError {
  message?: string | string[];
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiError>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (message) return message;
    if (!error.response) {
      return "Nie można połączyć się z serwerem. Sprawdź, czy backend działa.";
    }
  }
  return fallback;
}

function formatLessonStatus(status: string): string {
  switch (status) {
    case "SCHEDULED":
      return "Zaplanowana";
    case "COMPLETED":
      return "Zakończona";
    case "CANCELLED":
      return "Odwołana";
    default:
      return "Status nieznany";
  }
}

function formatActivityAction(action: string): string {
  const actionLabels: Record<string, string> = {
    USER_CREATED: "Utworzono konto użytkownika",
    USER_UPDATED: "Zmieniono dane konta",
    USER_DETAILS_UPDATED: "Zmieniono dane konta",
    USER_BLOCKED: "Zablokowano konto",
    USER_UNBLOCKED: "Odblokowano konto",
    TUTOR_ARCHIVED: "Zarchiwizowano konto korepetytora",
    TUTOR_DELETED: "Usunięto konto korepetytora",
    LESSON_CREATED: "Dodano termin lekcji",
    LESSON_UPDATED: "Zmieniono termin lekcji",
    LESSON_CANCELLED: "Odwołano lekcję",
    LESSON_DELETED: "Usunięto termin lekcji",
    LESSON_ISSUE_UPDATED: "Zaktualizowano zgłoszenie dotyczące lekcji",
    SUBJECT_REQUEST_APPROVED: "Zaakceptowano zgłoszenie przedmiotu",
    SUBJECT_REQUEST_REJECTED: "Odrzucono zgłoszenie przedmiotu",
    FINANCIAL_REPORT_GENERATED: "Wygenerowano raport finansowy",
  };
  return (
    actionLabels[action] ??
    `Inne działanie: ${action.replace(/_/g, " ").toLowerCase()}`
  );
}

export function UserManagement() {
  const usersQuery = useUsers();
  const { users, setUsers, fetchUsers } = usersQuery;
  const [refreshing, setRefreshing] = useState(false);
  const loading = usersQuery.loading || refreshing;
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [filterRole, setFilterRole] = useState<RoleFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [createForm, setCreateForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "tutor" as UserRole,
    phone: "",
  });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<number | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "student" as UserRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const displayError =
    error ??
    (usersQuery.error
      ? getErrorMessage(
          usersQuery.error,
          "Nie udało się pobrać użytkowników.",
        )
      : null);

  useEffect(() => {
    if (expandedActivityId === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpandedActivityId(null);
        setActivity(null);
        document
          .getElementById(`user-activity-toggle-${expandedActivityId}`)
          ?.focus();
      }
    }

    function handleOutsideClick(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        !event.target.closest(
          `[data-user-activity-id="${expandedActivityId}"]`,
        )
      ) {
        setExpandedActivityId(null);
        setActivity(null);
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedActivityId]);

  function beginEdit(user: UserItem) {
    setEditingUserId(user.id_users);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone ?? "",
      role: user.role.name,
    });
    setError(null);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingUserId === null) return;
    const currentUser = users.find((user) => user.id_users === editingUserId);
    if (
      currentUser &&
      currentUser.role.name !== editForm.role &&
      !window.confirm(
        `Zmienić rolę ${currentUser.first_name} ${currentUser.last_name} na ${
          editForm.role === "tutor" ? "korepetytora" : "ucznia"
        }? Zmiana jest możliwa tylko wtedy, gdy konto nie ma historii zajęć.`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.patch<UserItem>(`/users/${editingUserId}`, {
        ...editForm,
        phone: editForm.phone.trim() || null,
      });
      setUsers((previous) =>
        previous.map((user) => (user.id_users === data.id_users ? data : user)),
      );
      setEditingUserId(null);
      setNotice("Dane użytkownika zostały zapisane.");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Nie udało się zapisać danych użytkownika.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.post<UserItem>("/users", {
        ...createForm,
        phone: createForm.phone.trim() || undefined,
      });
      setUsers((previous) => [...previous, data]);
      setCreateForm({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "tutor",
        phone: "",
      });
      setShowCreateForm(false);
      setNotice("Konto użytkownika zostało utworzone.");
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(requestError, "Nie udało się utworzyć konta."),
      );
    } finally {
      setCreating(false);
    }
  }

  async function deleteTutor(user: UserItem) {
    if (
      !window.confirm(
        `Usunąć konto korepetytora ${user.first_name} ${user.last_name}?\n\nJeśli konto ma historię lekcji, opinii lub zgłoszeń, zostanie zablokowane, a historia zachowana. Konto bez historii zostanie trwale usunięte.`,
      )
    ) {
      return;
    }
    setDeletingUserId(user.id_users);
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.delete<UserItem & { archived?: boolean }>(
        `/users/${user.id_users}`,
      );
      if (data.archived) {
        setUsers((previous) =>
          previous.map((item) =>
            item.id_users === user.id_users
              ? { ...item, status: "BLOCKED" }
              : item,
          ),
        );
        setNotice(
          "Konto zostało zablokowane, a historia zajęć i zgłoszeń zachowana.",
        );
      } else {
        setUsers((previous) =>
          previous.filter((item) => item.id_users !== user.id_users),
        );
        setNotice("Konto korepetytora bez historii zostało usunięte.");
      }
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Nie udało się usunąć konta korepetytora.",
        ),
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  async function toggleUserStatus(user: UserItem) {
    const status: UserStatus = user.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    if (
      status === "BLOCKED" &&
      !window.confirm(
        `Zablokować konto ${user.first_name} ${user.last_name}? Użytkownik utraci dostęp do konta.`,
      )
    ) {
      return;
    }
    setUpdatingStatusId(user.id_users);
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.patch<UserItem>(
        `/users/${user.id_users}/status`,
        { status },
      );
      setUsers((previous) =>
        previous.map((item) => (item.id_users === data.id_users ? data : item)),
      );
      setNotice(
        status === "BLOCKED"
          ? "Konto użytkownika zostało zablokowane."
          : "Konto użytkownika zostało odblokowane.",
      );
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Nie udało się zmienić statusu użytkownika.",
        ),
      );
    } finally {
      setUpdatingStatusId(null);
    }
  }

  async function toggleActivity(userId: number) {
    if (expandedActivityId === userId) {
      setExpandedActivityId(null);
      setActivity(null);
      return;
    }
    setExpandedActivityId(userId);
    setActivity(null);
    setActivityLoading(true);
    try {
      const { data } = await api.get<UserActivity>(`/users/${userId}/activity`);
      setActivity(data);
    } catch (requestError: unknown) {
      setError(
        getErrorMessage(
          requestError,
          "Nie udało się pobrać aktywności użytkownika.",
        ),
      );
      setExpandedActivityId(null);
    } finally {
      setActivityLoading(false);
    }
  }

  async function refreshUsers() {
    setRefreshing(true);
    setError(null);
    try {
      await fetchUsers();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Nie udało się odświeżyć listy."));
    } finally {
      setRefreshing(false);
    }
  }

  function exportUsers() {
    const rows = [
      ["Imię", "Nazwisko", "Email", "Telefon", "Rola", "Status"],
      ...filteredUsers.map((user) => [
        user.first_name,
        user.last_name,
        user.email,
        user.phone ?? "",
        user.role.name,
        user.status,
      ]),
    ];
    downloadCsv("uzytkownicy-studyflow.csv", rows);
  }

  const filteredUsers = users.filter(
    (user) =>
      (filterRole === "all" || user.role.name === filterRole) &&
      `${user.first_name} ${user.last_name} ${user.email}`
        .toLocaleLowerCase("pl")
        .includes(searchTerm.trim().toLocaleLowerCase("pl")),
  );

  const filters: { id: RoleFilter; label: string }[] = [
    { id: "all", label: "Wszyscy" },
    { id: "student", label: "Uczniowie" },
    { id: "tutor", label: "Korepetytorzy" },
  ];

  return (
    <section className="space-y-6" aria-labelledby="user-management-title">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 md:flex-row md:items-center">
        <div>
          <h2
            id="user-management-title"
            className="flex items-center gap-2 text-xl font-bold text-brand-yellow"
          >
            <Users className="size-6" aria-hidden="true" />
            Zarządzanie użytkownikami
          </h2>
          <p className="mt-2 text-sm text-brand-textMuted">
            Przeglądaj konta uczniów i korepetytorów, edytuj dane oraz statusy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="user-search">
            Szukaj użytkownika
          </label>
          <input
            id="user-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Szukaj po nazwisku lub emailu"
            className="min-w-56 rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
          />
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilterRole(id)}
              aria-pressed={filterRole === id}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filterRole === id
                  ? "bg-brand-yellow text-brand-black"
                  : "border border-brand-cardBorder bg-brand-black text-white hover:border-brand-yellow/50"
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCreateForm((isOpen) => !isOpen)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-black transition hover:bg-brand-yellowHover"
          >
            <Plus className="size-4" aria-hidden="true" />
            Dodaj użytkownika
          </button>
          <button
            type="button"
            onClick={exportUsers}
            disabled={filteredUsers.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-brand-textMuted transition hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
          >
            <Download className="size-4" aria-hidden="true" />
            Eksport CSV
          </button>
          <button
            type="button"
            onClick={() => void refreshUsers()}
            disabled={loading}
            aria-label="Odśwież listę użytkowników"
            className="rounded-lg border border-brand-cardBorder p-2 text-brand-textMuted transition hover:border-brand-yellow hover:text-brand-yellow disabled:opacity-50"
          >
            <RefreshCw
              className={`size-5 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {notice && (
        <p
          className="rounded-xl border border-brand-yellow/40 bg-brand-yellow/10 p-4 text-sm text-brand-yellow"
          role="status"
        >
          {notice}
        </p>
      )}
      {displayError && (
        <p
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
          role="alert"
        >
          {displayError}
        </p>
      )}

      {showCreateForm && (
        <form
          onSubmit={createUser}
          className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 sm:grid-cols-2 xl:grid-cols-3"
        >
          <h3 className="text-lg font-bold sm:col-span-2 xl:col-span-3">
            Nowe konto
          </h3>
          <label className="space-y-2 text-sm text-brand-textMuted">
            Imię
            <input
              required
              maxLength={45}
              value={createForm.first_name}
              onChange={(event) =>
                setCreateForm({ ...createForm, first_name: event.target.value })
              }
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-textMuted">
            Nazwisko
            <input
              required
              maxLength={45}
              value={createForm.last_name}
              onChange={(event) =>
                setCreateForm({ ...createForm, last_name: event.target.value })
              }
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-textMuted">
            Email
            <input
              required
              type="email"
              maxLength={100}
              value={createForm.email}
              onChange={(event) =>
                setCreateForm({ ...createForm, email: event.target.value })
              }
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-textMuted">
            Hasło tymczasowe (min. 8 znaków, mała i wielka litera oraz cyfra)
            <input
              required
              type="password"
              minLength={8}
              maxLength={72}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+"
              title="Hasło musi zawierać małą i wielką literę oraz cyfrę."
              value={createForm.password}
              onChange={(event) =>
                setCreateForm({ ...createForm, password: event.target.value })
              }
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
            />
          </label>
          <label className="space-y-2 text-sm text-brand-textMuted">
            Rola
            <select
              value={createForm.role}
              onChange={(event) =>
                setCreateForm({
                  ...createForm,
                  role: event.target.value as UserRole,
                })
              }
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
            >
              <option value="tutor">Korepetytor</option>
              <option value="student">Uczeń</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-brand-textMuted">
            Telefon (opcjonalnie)
            <input
              maxLength={45}
              value={createForm.phone}
              onChange={(event) =>
                setCreateForm({ ...createForm, phone: event.target.value })
              }
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-white"
            />
          </label>
          <div className="flex gap-3 sm:col-span-2 xl:col-span-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-brand-black disabled:opacity-50"
            >
              {creating ? "Tworzenie…" : "Utwórz konto"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              disabled={creating}
              className="rounded-lg border border-brand-cardBorder px-4 py-2 text-white"
            >
              Anuluj
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p role="status" className="py-8 text-brand-textMuted">
          Ładowanie użytkowników…
        </p>
      ) : !displayError && filteredUsers.length === 0 ? (
        <p className="rounded-2xl border border-brand-cardBorder bg-brand-card p-8 text-center text-brand-textMuted">
          Brak użytkowników dla wybranego filtra.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-brand-cardBorder bg-brand-card">
          <table className="w-full min-w-[850px] text-left text-sm text-white">
            <thead className="border-b border-brand-cardBorder bg-brand-black text-xs uppercase text-brand-textMuted">
              <tr>
                <th className="px-5 py-4">Imię i nazwisko</th>
                <th className="px-5 py-4">Kontakt</th>
                <th className="px-5 py-4">Rola</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-cardBorder">
              {filteredUsers.map((user) => (
                <Fragment key={user.id_users}>
                <tr
                  data-user-activity-id={user.id_users}
                  className="align-top hover:bg-brand-black/30"
                >
                  <td className="px-5 py-4">
                    {editingUserId === user.id_users ? (
                      <form
                        id={`edit-user-${user.id_users}`}
                        onSubmit={saveUser}
                        className="space-y-2"
                      >
                        <input
                          aria-label="Imię"
                          value={editForm.first_name}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              first_name: event.target.value,
                            })
                          }
                          required
                          maxLength={45}
                          className="w-full rounded border border-brand-cardBorder bg-brand-black px-2 py-1"
                        />
                        <input
                          aria-label="Nazwisko"
                          value={editForm.last_name}
                          onChange={(event) =>
                            setEditForm({
                              ...editForm,
                              last_name: event.target.value,
                            })
                          }
                          required
                          maxLength={45}
                          className="w-full rounded border border-brand-cardBorder bg-brand-black px-2 py-1"
                        />
                      </form>
                    ) : (
                      <span className="font-semibold">
                        {user.first_name} {user.last_name}
                      </span>
                    )}
                  </td>
                  <td className="space-y-2 px-5 py-4 text-xs text-brand-textMuted">
                    {editingUserId === user.id_users ? (
                      <>
                        <label className="flex items-center gap-2">
                          <Mail
                            className="size-4 shrink-0 text-brand-yellow"
                            aria-hidden="true"
                          />
                          <input
                            form={`edit-user-${user.id_users}`}
                            aria-label="Email"
                            type="email"
                            value={editForm.email}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                email: event.target.value,
                              })
                            }
                            required
                            maxLength={100}
                            className="w-full rounded border border-brand-cardBorder bg-brand-black px-2 py-1 text-white"
                          />
                        </label>
                        <label className="flex items-center gap-2">
                          <Phone
                            className="size-4 shrink-0 text-brand-yellow"
                            aria-hidden="true"
                          />
                          <input
                            form={`edit-user-${user.id_users}`}
                            aria-label="Telefon"
                            value={editForm.phone}
                            onChange={(event) =>
                              setEditForm({
                                ...editForm,
                                phone: event.target.value,
                              })
                            }
                            maxLength={45}
                            className="w-full rounded border border-brand-cardBorder bg-brand-black px-2 py-1 text-white"
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Mail
                            className="size-4 text-brand-yellow"
                            aria-hidden="true"
                          />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2">
                            <Phone
                              className="size-4 text-brand-yellow"
                              aria-hidden="true"
                            />
                            {user.phone}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {editingUserId === user.id_users ? (
                      <select
                        form={`edit-user-${user.id_users}`}
                        aria-label="Rola użytkownika"
                        value={editForm.role}
                        onChange={(event) =>
                          setEditForm({
                            ...editForm,
                            role: event.target.value as UserRole,
                          })
                        }
                        className="rounded border border-brand-cardBorder bg-brand-black px-2 py-1 text-xs text-white"
                      >
                        <option value="student">Uczeń</option>
                        <option value="tutor">Korepetytor</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-brand-cardBorder bg-brand-black px-2.5 py-1 text-xs capitalize">
                        <Shield
                          className="size-3.5 text-brand-yellow"
                          aria-hidden="true"
                        />
                        {user.role.name}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs ${
                        user.status === "ACTIVE"
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-red-500/30 bg-red-500/10 text-red-400"
                      }`}
                    >
                      {user.status === "ACTIVE" ? "Aktywny" : "Zablokowany"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {editingUserId === user.id_users ? (
                        <>
                          <button
                            type="submit"
                            form={`edit-user-${user.id_users}`}
                            disabled={saving}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-yellow px-3 py-2 text-xs font-semibold text-brand-black disabled:opacity-50"
                          >
                            <Save className="size-3.5" aria-hidden="true" />
                            {saving ? "Zapisywanie…" : "Zapisz"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            disabled={saving}
                            aria-label="Anuluj edycję"
                            className="rounded-lg border border-brand-cardBorder p-2 text-brand-textMuted hover:text-white"
                          >
                            <X className="size-4" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => void toggleActivity(user.id_users)}
                            id={`user-activity-toggle-${user.id_users}`}
                            aria-expanded={expandedActivityId === user.id_users}
                            aria-controls={`user-activity-${user.id_users}`}
                            aria-label={`Pokaż aktywność ${user.first_name} ${user.last_name}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-xs transition hover:border-brand-yellow hover:text-brand-yellow"
                          >
                            <Activity className="size-3.5" aria-hidden="true" />
                            Aktywność
                          </button>
                          <button
                            type="button"
                            onClick={() => beginEdit(user)}
                            aria-label={`Edytuj ${user.first_name} ${user.last_name}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-brand-cardBorder px-3 py-2 text-xs transition hover:border-brand-yellow hover:text-brand-yellow"
                          >
                            <Pencil className="size-3.5" aria-hidden="true" />
                            Edytuj
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleUserStatus(user)}
                            disabled={updatingStatusId !== null}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                              user.status === "ACTIVE"
                                ? "bg-red-500/15 text-red-300 hover:bg-red-500 hover:text-black"
                                : "bg-green-500/15 text-green-300 hover:bg-green-500 hover:text-black"
                            }`}
                          >
                            {user.status === "ACTIVE" ? (
                              <>
                                <UserX
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                Zablokuj
                              </>
                            ) : (
                              <>
                                <UserCheck
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                Odblokuj
                              </>
                            )}
                          </button>
                          {user.role.name === "tutor" && (
                            <button
                              type="button"
                              onClick={() => void deleteTutor(user)}
                              disabled={deletingUserId === user.id_users}
                              aria-label={`Usuń lub zarchiwizuj korepetytora ${user.first_name} ${user.last_name}`}
                              title="Usuń lub zarchiwizuj korepetytora"
                              className="rounded-lg border border-red-500/30 p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedActivityId === user.id_users && (
                  <tr>
                    <td
                      data-user-activity-id={user.id_users}
                      id={`user-activity-${user.id_users}`}
                      colSpan={5}
                      className="border-t border-brand-cardBorder bg-brand-black/40 px-5 py-4"
                    >
                      {activityLoading ? (
                        <p role="status" className="text-sm text-brand-textMuted">
                          Ładowanie aktywności…
                        </p>
                      ) : activity ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-semibold text-white">
                              Aktywność: {user.first_name} {user.last_name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedActivityId(null);
                                setActivity(null);
                                document
                                  .getElementById(
                                    `user-activity-toggle-${user.id_users}`,
                                  )
                                  ?.focus();
                              }}
                              className="rounded-lg border border-brand-cardBorder px-3 py-1.5 text-xs text-brand-textMuted transition hover:border-brand-yellow hover:text-white"
                            >
                              Zamknij
                            </button>
                          </div>
                          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                            <p className="rounded-lg bg-brand-black/60 px-3 py-2 text-brand-textMuted">
                              Konto od{" "}
                              <span className="font-semibold text-white">
                                {new Date(activity.user.created_at).toLocaleDateString("pl-PL")}
                              </span>
                            </p>
                            <p className="rounded-lg bg-brand-black/60 px-3 py-2 text-brand-textMuted">
                              Rezerwacje ucznia:{" "}
                              <span className="font-semibold text-white">{activity.bookingCount}</span>
                            </p>
                            <p className="rounded-lg bg-brand-black/60 px-3 py-2 text-brand-textMuted">
                              Lekcje prowadzone:{" "}
                              <span className="font-semibold text-white">{activity.tutoringLessonCount}</span>
                            </p>
                            <p className="rounded-lg bg-brand-black/60 px-3 py-2 text-brand-textMuted">
                              Wystawione opinie:{" "}
                              <span className="font-semibold text-white">{activity.reviewCount}</span>
                            </p>
                            <p className="rounded-lg bg-brand-black/60 px-3 py-2 text-brand-textMuted">
                              Wystawione oceny:{" "}
                              <span className="font-semibold text-white">{activity.gradeCount}</span>
                            </p>
                          </div>
                          {activity.user.bookings_as_student.length > 0 && (
                            <div>
                              <h4 className="mb-1 text-sm font-semibold text-brand-yellow">
                                Ostatnie rezerwacje ucznia
                              </h4>
                              <ul className="space-y-1 text-xs text-brand-textMuted">
                                {activity.user.bookings_as_student.slice(0, 5).map((booking) => (
                                  <li
                                    key={booking.lesson.id_lessons}
                                    className="rounded-lg bg-brand-black/60 px-3 py-2"
                                  >
                                    <span className="font-medium text-white">
                                      {booking.lesson.subject.name}
                                    </span>
                                    {" · "}
                                    {formatDateOnly(booking.lesson.lesson_date)}
                                    {` · ${booking.lesson.start_time}–${booking.lesson.end_time}`}
                                    {` · korepetytor: ${booking.lesson.tutor.first_name} ${booking.lesson.tutor.last_name}`}
                                    {` · ${formatLessonStatus(booking.lesson.status)}`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {activity.user.lessons_as_tutor.length > 0 && (
                            <div>
                              <h4 className="mb-1 text-sm font-semibold text-brand-yellow">
                                Ostatnie prowadzone lekcje
                              </h4>
                              <ul className="space-y-1 text-xs text-brand-textMuted">
                                {activity.user.lessons_as_tutor.slice(0, 5).map((lesson) => (
                                  <li
                                    key={lesson.id_lessons}
                                    className="rounded-lg bg-brand-black/60 px-3 py-2"
                                  >
                                    <span className="font-medium text-white">
                                      {lesson.subject.name}
                                    </span>
                                    {" · "}
                                    {formatDateOnly(lesson.lesson_date)}
                                    {` · ${lesson.start_time}–${lesson.end_time}`}
                                    {` · ${formatLessonStatus(lesson.status)}`}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {activity.auditEvents.length > 0 && (
                            <div>
                              <h4 className="mb-1 text-sm font-semibold text-brand-yellow">
                                Historia działań
                              </h4>
                              <ul className="space-y-2 text-xs text-brand-textMuted">
                                {activity.auditEvents.map((entry) => {
                                  const relatedLesson =
                                    entry.entity_type === "lesson" &&
                                    entry.entity_id !== null
                                      ? [
                                          ...activity.user.lessons_as_tutor,
                                          ...activity.user.bookings_as_student.map(
                                            (booking) => booking.lesson,
                                          ),
                                        ].find(
                                          (lesson) =>
                                            lesson.id_lessons === entry.entity_id,
                                        )
                                      : undefined;

                                  return (
                                    <li
                                      key={entry.id_admin_audit_logs}
                                      className="rounded-lg bg-brand-black/60 px-3 py-2"
                                    >
                                      <p className="font-medium text-white">
                                        {formatActivityAction(entry.action)}
                                      </p>
                                      {relatedLesson ? (
                                        <p className="mt-1">
                                          {relatedLesson.subject.name}
                                          {" · "}
                                          {formatDateOnly(
                                            relatedLesson.lesson_date,
                                          )}
                                          {` · ${relatedLesson.start_time}–${relatedLesson.end_time}`}
                                        </p>
                                      ) : entry.entity_type === "lesson" &&
                                        entry.entity_id !== null ? (
                                        <p className="mt-1">
                                          Lekcja nr {entry.entity_id}
                                        </p>
                                      ) : null}
                                      <p className="mt-1">
                                        {new Date(entry.created_at).toLocaleString("pl-PL")}
                                        {" · "}
                                        {entry.actor
                                          ? `Wykonał(a): ${entry.actor.first_name} ${entry.actor.last_name}`
                                          : "Wykonawca: usunięte konto"}
                                      </p>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
