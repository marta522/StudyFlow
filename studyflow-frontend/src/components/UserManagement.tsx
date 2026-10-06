import axios from "axios";
import {
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
import { useCallback, useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";

type UserStatus = "ACTIVE" | "BLOCKED";
type UserRole = "student" | "tutor";
type RoleFilter = "all" | UserRole;

interface UserItem {
  id_users: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  role: { name: UserRole };
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

export function UserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data } = await api.get<UserItem[]>("/users");
    setUsers(data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<UserItem[]>("/users")
      .then(({ data }) => {
        if (!cancelled) setUsers(data);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            getErrorMessage(requestError, "Nie udało się pobrać użytkowników."),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function beginEdit(user: UserItem) {
    setEditingUserId(user.id_users);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone ?? "",
    });
    setError(null);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingUserId === null) return;

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
        `Czy na pewno usunąć konto ${user.first_name} ${user.last_name}?`,
      )
    ) {
      return;
    }
    setDeletingUserId(user.id_users);
    setError(null);
    setNotice(null);
    try {
      await api.delete(`/users/${user.id_users}`);
      setUsers((previous) =>
        previous.filter((item) => item.id_users !== user.id_users),
      );
      setNotice("Konto korepetytora zostało usunięte.");
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

  async function refreshUsers() {
    setLoading(true);
    setError(null);
    try {
      await fetchUsers();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Nie udało się odświeżyć listy."));
    } finally {
      setLoading(false);
    }
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
      {error && (
        <p
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
          role="alert"
        >
          {error}
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
            Hasło tymczasowe (min. 8 znaków)
            <input
              required
              type="password"
              minLength={8}
              maxLength={72}
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
      ) : !error && filteredUsers.length === 0 ? (
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
                <tr
                  key={user.id_users}
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-brand-cardBorder bg-brand-black px-2.5 py-1 text-xs capitalize">
                      <Shield
                        className="size-3.5 text-brand-yellow"
                        aria-hidden="true"
                      />
                      {user.role.name}
                    </span>
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
                              aria-label={`Usuń korepetytora ${user.first_name} ${user.last_name}`}
                              title="Usuń korepetytora"
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
