import axios from "axios";
import {
  CalendarDays,
  Check,
  Clock3,
  DollarSign,
  Edit3,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import api from "../api/axios";

interface TutorProfileData {
  first_name: string;
  last_name: string;
  about_me: string | null;
  experience: string | null;
  created_at: string;
}

interface TutorStats {
  completedHours: number;
  currentMonthPayout: number;
  studentCount: number;
}

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
  return "Nie udało się wykonać operacji.";
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function TutorProfile() {
  const [profile, setProfile] = useState<TutorProfileData | null>(null);
  const [stats, setStats] = useState<TutorStats | null>(null);
  const [aboutMe, setAboutMe] = useState("");
  const [experience, setExperience] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadProfile() {
    const [profileResponse, statsResponse] = await Promise.all([
      api.get<TutorProfileData>("/tutors/me/profile"),
      api.get<TutorStats>("/tutors/me/stats"),
    ]);
    setProfile(profileResponse.data);
    setStats(statsResponse.data);
    setAboutMe(profileResponse.data.about_me ?? "");
    setExperience(profileResponse.data.experience ?? "");
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      api.get<TutorProfileData>("/tutors/me/profile"),
      api.get<TutorStats>("/tutors/me/stats"),
    ])
      .then(([profileResponse, statsResponse]) => {
        if (!cancelled) {
          setProfile(profileResponse.data);
          setStats(statsResponse.data);
          setAboutMe(profileResponse.data.about_me ?? "");
          setExperience(profileResponse.data.experience ?? "");
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.patch<TutorProfileData>("/tutors/me/profile", {
        about_me: aboutMe.trim() || null,
        experience: experience.trim() || null,
      });
      setProfile(data);
      setAboutMe(data.about_me ?? "");
      setExperience(data.experience ?? "");
      setIsEditing(false);
      setNotice("Zapisano zmiany w profilu.");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    setAboutMe(profile?.about_me ?? "");
    setExperience(profile?.experience ?? "");
    setIsEditing(false);
    setError(null);
  }

  const teachingSince = profile
    ? new Intl.DateTimeFormat("pl-PL", {
        month: "long",
        year: "numeric",
      }).format(new Date(profile.created_at))
    : "";

  if (loading) {
    return (
      <p role="status" className="py-8 text-center text-brand-textMuted">
        Ładowanie profilu…
      </p>
    );
  }

  if (!profile || !stats) {
    return (
      <section className="space-y-4">
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            void loadProfile()
              .catch((requestError: unknown) =>
                setError(getErrorMessage(requestError)),
              )
              .finally(() => setLoading(false));
          }}
          className="rounded-lg border border-brand-cardBorder px-4 py-2 text-sm hover:border-brand-yellow"
        >
          Spróbuj ponownie
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="tutor-profile-heading">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-300"
        >
          {notice}
        </p>
      )}
      <div className="space-y-6 rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="tutor-profile-heading" className="text-2xl font-bold">
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="text-sm text-brand-textMuted">
              Korepetytor w StudyFlow
            </p>
          </div>
          {isEditing ? (
            <div className="flex gap-2">
              <button
                type="submit"
                form="tutor-profile-form"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-brand-black hover:bg-brand-yellowHover disabled:opacity-50"
              >
                <Check className="size-4" aria-hidden="true" />
                {saving ? "Zapisywanie…" : "Zapisz"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-cardBorder px-4 py-2 text-sm text-white hover:border-brand-yellow disabled:opacity-50"
              >
                <X className="size-4" aria-hidden="true" />
                Anuluj
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-brand-black hover:bg-brand-yellowHover"
            >
              <Edit3 className="size-4" aria-hidden="true" />
              Edytuj profil
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <article className="rounded-xl border border-brand-cardBorder bg-brand-black p-4">
            <Clock3
              className="mb-2 size-6 text-brand-yellow"
              aria-hidden="true"
            />
            <p className="text-xs text-brand-textMuted">Ukończone godziny</p>
            <p className="text-2xl font-extrabold">{stats.completedHours} h</p>
          </article>
          <article className="rounded-xl border border-brand-cardBorder bg-brand-black p-4">
            <DollarSign
              className="mb-2 size-6 text-brand-yellow"
              aria-hidden="true"
            />
            <p className="text-xs text-brand-textMuted">
              Wypłata w bieżącym miesiącu
            </p>
            <p className="text-xl font-extrabold text-brand-yellow">
              {formatMoney(stats.currentMonthPayout)}
            </p>
          </article>
          <article className="rounded-xl border border-brand-cardBorder bg-brand-black p-4">
            <Users
              className="mb-2 size-6 text-brand-yellow"
              aria-hidden="true"
            />
            <p className="text-xs text-brand-textMuted">Uczniowie</p>
            <p className="text-2xl font-extrabold">{stats.studentCount}</p>
          </article>
          <article className="rounded-xl border border-brand-cardBorder bg-brand-black p-4">
            <CalendarDays
              className="mb-2 size-6 text-brand-yellow"
              aria-hidden="true"
            />
            <p className="text-xs text-brand-textMuted">Konto od</p>
            <p className="text-lg font-extrabold capitalize">{teachingSince}</p>
          </article>
        </div>
      </div>
      <form
        id="tutor-profile-form"
        onSubmit={(event) => void handleSave(event)}
        className="grid grid-cols-1 gap-5 md:grid-cols-2"
      >
        <section className="space-y-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
          <h3 className="text-lg font-bold text-brand-yellow">O mnie</h3>
          {isEditing ? (
            <textarea
              value={aboutMe}
              onChange={(event) => setAboutMe(event.target.value)}
              maxLength={10000}
              rows={5}
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black p-3 text-sm text-white"
            />
          ) : (
            <p className="min-h-20 whitespace-pre-wrap text-sm leading-relaxed text-brand-textMuted">
              {profile.about_me ||
                "Uzupełnij opis, aby uczniowie mogli lepiej Cię poznać."}
            </p>
          )}
        </section>
        <section className="space-y-3 rounded-2xl border border-brand-cardBorder bg-brand-card p-6">
          <h3 className="text-lg font-bold text-brand-yellow">Doświadczenie</h3>
          {isEditing ? (
            <textarea
              value={experience}
              onChange={(event) => setExperience(event.target.value)}
              maxLength={10000}
              rows={5}
              className="w-full rounded-lg border border-brand-cardBorder bg-brand-black p-3 text-sm text-white"
            />
          ) : (
            <p className="min-h-20 whitespace-pre-wrap text-sm leading-relaxed text-brand-textMuted">
              {profile.experience || "Dodaj informacje o swoim doświadczeniu."}
            </p>
          )}
        </section>
      </form>
    </section>
  );
}
