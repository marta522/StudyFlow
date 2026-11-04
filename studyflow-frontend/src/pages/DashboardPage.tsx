import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import type { TutorAction } from "../components/MyTutors";
import { useAuth } from "../context/useAuth";

const FinancialReports = lazy(() =>
  import("../components/FinancialReports").then((module) => ({
    default: module.FinancialReports,
  })),
);
const LessonsList = lazy(() =>
  import("../components/LessonsList").then((module) => ({
    default: module.LessonsList,
  })),
);
const MyBookings = lazy(() =>
  import("../components/MyBookings").then((module) => ({
    default: module.MyBookings,
  })),
);
const StudentStats = lazy(() =>
  import("../components/StudentStats").then((module) => ({
    default: module.StudentStats,
  })),
);
const SubjectRequests = lazy(() =>
  import("../components/SubjectRequests").then((module) => ({
    default: module.SubjectRequests,
  })),
);
const UserManagement = lazy(() =>
  import("../components/UserManagement").then((module) => ({
    default: module.UserManagement,
  })),
);
const TutorStudents = lazy(() =>
  import("../components/TutorStudents").then((module) => ({
    default: module.TutorStudents,
  })),
);
const TutorAvailability = lazy(() =>
  import("../components/TutorAvailability").then((module) => ({
    default: module.TutorAvailability,
  })),
);
const TutorProfile = lazy(() =>
  import("../components/TutorProfile").then((module) => ({
    default: module.TutorProfile,
  })),
);
const MyTutors = lazy(() =>
  import("../components/MyTutors").then((module) => ({
    default: module.MyTutors,
  })),
);
const TutorDetailView = lazy(() =>
  import("../components/TutorDetailView").then((module) => ({
    default: module.TutorDetailView,
  })),
);
const TutorSearch = lazy(() =>
  import("../components/TutorSearch").then((module) => ({
    default: module.TutorSearch,
  })),
);
const AdminMetrics = lazy(() =>
  import("../components/AdminMetrics").then((module) => ({
    default: module.AdminMetrics,
  })),
);
const AdminSchedule = lazy(() =>
  import("../components/AdminSchedule").then((module) => ({
    default: module.AdminSchedule,
  })),
);
const AdminLessonIssues = lazy(() =>
  import("../components/AdminLessonIssues").then((module) => ({
    default: module.AdminLessonIssues,
  })),
);
const AdminSubjects = lazy(() =>
  import("../components/AdminSubjects").then((module) => ({
    default: module.AdminSubjects,
  })),
);

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
  | "admin-subjects"
  | "admin-issues";

function isAllowedDashboardTab(
  tab: string,
  allowedTabs: readonly DashboardTab[],
): tab is DashboardTab {
  return allowedTabs.some((allowedTab) => allowedTab === tab);
}

export function DashboardPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [welcomeVisible, setWelcomeVisible] = useState(true);
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
              "admin-issues",
              "subject-requests",
              "reports",
            ]
          : [];

  const requestedTab = searchParams.get("tab");
  const activeTab = requestedTab && isAllowedDashboardTab(requestedTab, allowedTabs)
    ? requestedTab
    : "my-bookings";

  useEffect(() => {
    if (requestedTab === activeTab) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", activeTab);
    setSearchParams(nextParams, { replace: true });
  }, [activeTab, requestedTab, searchParams, setSearchParams]);

  function handleTabChange(tab: string) {
    if (!isAllowedDashboardTab(tab, allowedTabs)) return;
    if (tab !== "my-bookings") {
      setWelcomeVisible(false);
    }
    if (requestedTab !== tab) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tab);
      setSearchParams(nextParams);
    }
    setSelectedTutor(null);
  }

  return (
    <div className="min-h-screen bg-brand-black text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />

      <main className="full-width-container space-y-8 py-6 sm:py-8">
        {activeTab === "my-bookings" &&
          welcomeVisible &&
          !selectedTutor &&
          user && (
            <section className="flex flex-col justify-between gap-5 rounded-2xl border border-brand-cardBorder bg-brand-card p-6 sm:flex-row sm:items-center sm:p-8">
              <div>
                <p className="text-sm font-medium text-brand-yellow">
                  Twój panel StudyFlow
                </p>
                <h1 className="dashboard-welcome-title mt-2 font-extrabold tracking-tight">
                  Witaj ponownie, {user.first_name}!
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-textMuted sm:text-base">
                  Tutaj znajdziesz swój harmonogram oraz lekcje, które już się
                  odbyły i te, które dopiero przed Tobą.
                </p>
              </div>
            </section>
          )}

        <section className="pt-4" aria-live="polite">
          <Suspense
            fallback={
              <p role="status" className="py-8 text-center text-brand-textMuted">
                Ładowanie widoku…
              </p>
            }
          >
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
            (user?.role === "admin" ? (
              <AdminSchedule />
            ) : (
              <MyBookings
                onOpenTutorStudents={() => handleTabChange("tutor-students")}
              />
            ))}
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
            <AdminMetrics
              onGoToRequests={() => handleTabChange("subject-requests")}
              onGoToSchedule={() => handleTabChange("my-bookings")}
            />
          )}
          {activeTab === "admin-subjects" && user?.role === "admin" && (
            <AdminSubjects
              onGoToRequests={() => handleTabChange("subject-requests")}
            />
          )}
          {activeTab === "admin-issues" && user?.role === "admin" && (
            <AdminLessonIssues />
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
          </Suspense>
        </section>
      </main>
    </div>
  );
}
