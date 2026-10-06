import { useState } from "react";
import { Navbar } from "../components/Navbar";
import { FinancialReports } from "../components/FinancialReports";
import { LessonsList } from "../components/LessonsList";
import { MyBookings } from "../components/MyBookings";
import { StudentStats } from "../components/StudentStats";
import { SubjectRequests } from "../components/SubjectRequests";
import { UserManagement } from "../components/UserManagement";
import { TutorStudents } from "../components/TutorStudents";
import { TutorAvailability } from "../components/TutorAvailability";
import { TutorProfile } from "../components/TutorProfile";
import { MyTutors, type TutorAction } from "../components/MyTutors";
import { TutorDetailView } from "../components/TutorDetailView";
import { TutorSearch } from "../components/TutorSearch";
import { AdminMetrics } from "../components/AdminMetrics";
import { AdminSchedule } from "../components/AdminSchedule";
import { AdminSubjects } from "../components/AdminSubjects";
import { useAuth } from "../context/useAuth";

type DashboardTab =
  | "available"
  | "find-tutors"
  | "my-bookings"
  | "reports"
  | "subject-requests"
  | "users"
  | "stats"
  | "my-tutors"
  | "tutor-students"
  | "tutor-availability"
  | "tutor-profile"
  | "admin-metrics"
  | "admin-subjects";

function isAllowedDashboardTab(
  tab: string,
  allowedTabs: readonly DashboardTab[],
): tab is DashboardTab {
  return allowedTabs.some((allowedTab) => allowedTab === tab);
}

export function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>("available");
  const [selectedTutor, setSelectedTutor] = useState<{
    id: number;
    action: TutorAction;
  } | null>(null);

  const allowedTabs: DashboardTab[] =
    user?.role === "student"
      ? ["available", "find-tutors", "my-bookings", "my-tutors", "stats"]
      : user?.role === "tutor"
        ? [
            "available",
            "my-bookings",
            "tutor-students",
            "tutor-availability",
            "tutor-profile",
            "subject-requests",
          ]
        : user?.role === "admin"
          ? [
              "admin-metrics",
              "users",
              "my-bookings",
              "admin-subjects",
              "subject-requests",
              "reports",
            ]
          : [];

  return (
    <div className="min-h-screen bg-brand-black text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (isAllowedDashboardTab(tab, allowedTabs)) {
            setActiveTab(tab);
            setSelectedTutor(null);
          }
        }}
      />

      <main className="full-width-container space-y-8 py-6 sm:py-8">
        {!selectedTutor && (
          <section className="flex flex-col justify-between gap-5 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-sm font-medium text-brand-yellow">
                Twój panel StudyFlow
              </p>
              <h1 className="dashboard-welcome-title mt-2 font-extrabold tracking-tight">
                Witaj ponownie, {user?.first_name}!
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-textMuted sm:text-base">
                Wybierz obszar, do którego chcesz przejść. Twoja nauka i
                organizacja zajęć zaczynają się tutaj.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-brand-yellow/40 bg-brand-yellow/10 px-4 py-2 text-sm font-medium capitalize text-brand-yellow">
              Rola: {user?.role}
            </span>
          </section>
        )}

        <section className="pt-4" aria-live="polite">
          {activeTab === "available" && <LessonsList />}
          {activeTab === "find-tutors" &&
            user?.role === "student" &&
            (selectedTutor ? (
              <TutorDetailView
                key={selectedTutor.id}
                tutorId={selectedTutor.id}
                initialAction={selectedTutor.action}
                onBack={() => setSelectedTutor(null)}
              />
            ) : (
              <TutorSearch
                onSelectTutor={(tutorId) =>
                  setSelectedTutor({ id: tutorId, action: "profile" })
                }
              />
            ))}
          {activeTab === "my-bookings" &&
            (user?.role === "admin" ? <AdminSchedule /> : <MyBookings />)}
          {activeTab === "reports" && user?.role === "admin" && (
            <FinancialReports />
          )}
          {activeTab === "subject-requests" &&
            (user?.role === "admin" || user?.role === "tutor") && (
              <SubjectRequests />
            )}
          {activeTab === "stats" && user?.role === "student" && (
            <StudentStats />
          )}
          {activeTab === "my-tutors" &&
            user?.role === "student" &&
            (selectedTutor ? (
              <TutorDetailView
                key={selectedTutor.id}
                tutorId={selectedTutor.id}
                initialAction={selectedTutor.action}
                onBack={() => setSelectedTutor(null)}
              />
            ) : (
              <MyTutors
                onSelectTutor={(tutorId, action) =>
                  setSelectedTutor({ id: tutorId, action })
                }
              />
            ))}
          {activeTab === "users" && user?.role === "admin" && (
            <UserManagement />
          )}
          {activeTab === "admin-metrics" && user?.role === "admin" && (
            <AdminMetrics />
          )}
          {activeTab === "admin-subjects" && user?.role === "admin" && (
            <AdminSubjects
              onGoToRequests={() => setActiveTab("subject-requests")}
            />
          )}
          {activeTab === "tutor-students" && user?.role === "tutor" && (
            <TutorStudents />
          )}
          {activeTab === "tutor-availability" && user?.role === "tutor" && (
            <TutorAvailability />
          )}
          {activeTab === "tutor-profile" && user?.role === "tutor" && (
            <TutorProfile />
          )}
        </section>
      </main>
    </div>
  );
}
