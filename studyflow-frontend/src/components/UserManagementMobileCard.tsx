import type { FormEventHandler } from "react";
import type { UserItem, UserRole } from "../hooks/useUsers";

export interface UserEditForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface UserActivitySummary {
  createdAt: string;
  bookingCount: number;
  tutoringLessonCount: number;
  reviewCount: number;
  gradeCount: number;
}

export function UserManagementMobileCard({
  user,
  isEditing,
  isExpanded,
  editForm,
  saving,
  updatingStatus,
  deleting,
  activityLoading,
  activitySummary,
  onSubmit,
  onCancelEdit,
  onEditChange,
  onToggleActivity,
  onBeginEdit,
  onToggleStatus,
  onDeleteTutor,
}: {
  user: UserItem;
  isEditing: boolean;
  isExpanded: boolean;
  editForm: UserEditForm;
  saving: boolean;
  updatingStatus: boolean;
  deleting: boolean;
  activityLoading: boolean;
  activitySummary: UserActivitySummary | null;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancelEdit: () => void;
  onEditChange: (field: keyof UserEditForm, value: string) => void;
  onToggleActivity: () => void;
  onBeginEdit: () => void;
  onToggleStatus: () => void;
  onDeleteTutor: () => void;
}) {
  return (
    <article
      data-user-activity-id={user.id_users}
      className="space-y-4 rounded-2xl border border-brand-cardBorder bg-brand-card p-4"
    >
      {isEditing ? (
        <form
          id={`mobile-edit-user-${user.id_users}`}
          onSubmit={onSubmit}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              aria-label="Imię"
              value={editForm.first_name}
              onChange={(event) => onEditChange("first_name", event.target.value)}
              required
              maxLength={45}
              className="min-w-0 rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
            />
            <input
              aria-label="Nazwisko"
              value={editForm.last_name}
              onChange={(event) => onEditChange("last_name", event.target.value)}
              required
              maxLength={45}
              className="min-w-0 rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
            />
          </div>
          <input
            aria-label="Email"
            type="email"
            value={editForm.email}
            onChange={(event) => onEditChange("email", event.target.value)}
            required
            maxLength={100}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
          />
          <input
            aria-label="Telefon"
            value={editForm.phone}
            onChange={(event) => onEditChange("phone", event.target.value)}
            maxLength={45}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
          />
          <select
            aria-label="Rola użytkownika"
            value={editForm.role}
            onChange={(event) => onEditChange("role", event.target.value)}
            className="w-full rounded-lg border border-brand-cardBorder bg-brand-black px-3 py-2 text-sm text-white"
          >
            <option value="student">Uczeń</option>
            <option value="tutor">Korepetytor</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-brand-yellow px-3 py-2 text-sm font-semibold text-brand-black disabled:opacity-50"
            >
              {saving ? "Zapisywanie…" : "Zapisz"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={saving}
              className="rounded-lg border border-brand-cardBorder px-3 py-2 text-sm text-white"
            >
              Anuluj
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">
                {user.first_name} {user.last_name}
              </h3>
              <p className="mt-1 break-all text-sm text-brand-textMuted">
                {user.email}
              </p>
              {user.phone && (
                <p className="mt-1 text-sm text-brand-textMuted">{user.phone}</p>
              )}
            </div>
            <span
              className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${
                user.status === "ACTIVE"
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {user.status === "ACTIVE" ? "Aktywny" : "Zablokowany"}
            </span>
          </div>
          <p className="text-xs capitalize text-brand-yellow">
            {user.role.name === "tutor" ? "Korepetytor" : "Uczeń"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              id={`mobile-user-activity-toggle-${user.id_users}`}
              onClick={onToggleActivity}
              aria-expanded={isExpanded}
              aria-controls={`mobile-user-activity-${user.id_users}`}
              className="rounded-lg border border-brand-cardBorder px-3 py-2 text-xs text-white"
            >
              Aktywność
            </button>
            <button
              type="button"
              onClick={onBeginEdit}
              className="rounded-lg border border-brand-cardBorder px-3 py-2 text-xs text-white"
            >
              Edytuj
            </button>
            <button
              type="button"
              onClick={onToggleStatus}
              disabled={updatingStatus}
              className="rounded-lg border border-brand-cardBorder px-3 py-2 text-xs text-white disabled:opacity-50"
            >
              {user.status === "ACTIVE" ? "Zablokuj" : "Odblokuj"}
            </button>
            {user.role.name === "tutor" && (
              <button
                type="button"
                onClick={onDeleteTutor}
                disabled={deleting}
                className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
              >
                {deleting ? "Usuwanie…" : "Usuń korepetytora"}
              </button>
            )}
          </div>
          {isExpanded && (
            <div
              id={`mobile-user-activity-${user.id_users}`}
              className="space-y-2 border-t border-brand-cardBorder pt-3 text-xs text-brand-textMuted"
            >
              {activityLoading ? (
                <p role="status">Ładowanie aktywności…</p>
              ) : activitySummary ? (
                <>
                  <p>
                    Konto od{" "}
                    {new Date(activitySummary.createdAt).toLocaleDateString(
                      "pl-PL",
                    )}
                  </p>
                  <p>
                    Rezerwacje: {activitySummary.bookingCount} · prowadzone
                    lekcje: {activitySummary.tutoringLessonCount}
                  </p>
                  <p>
                    Opinie: {activitySummary.reviewCount} · oceny:{" "}
                    {activitySummary.gradeCount}
                  </p>
                </>
              ) : (
                <p>Brak danych o aktywności.</p>
              )}
            </div>
          )}
        </>
      )}
    </article>
  );
}
