import { lazy, Suspense, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { LandingPage } from "./pages/LandingPage";

const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((module) => ({
    default: module.LoginPage,
  })),
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((module) => ({
    default: module.RegisterPage,
  })),
);
const PasswordRecoveryPage = lazy(() =>
  import("./pages/PasswordRecoveryPage").then((module) => ({
    default: module.PasswordRecoveryPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import("./pages/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const TutorSearch = lazy(() =>
  import("./components/TutorSearch").then((module) => ({
    default: module.TutorSearch,
  })),
);

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, authError, logout } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-black text-white">
        <p role="status" className="text-brand-textMuted">
          Sprawdzanie sesji…
        </p>
      </main>
    );
  }

  if (authError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-brand-black px-4 text-white">
        <section className="max-w-md rounded-2xl border border-brand-cardBorder bg-brand-card p-7 text-center">
          <h1 className="text-xl font-semibold">
            Nie udało się sprawdzić sesji
          </h1>
          <p className="mt-3 text-sm text-brand-textMuted">{authError}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 rounded-lg bg-brand-yellow px-5 py-3 font-semibold text-brand-black transition hover:bg-brand-yellowHover"
          >
            Przejdź do logowania
          </button>
        </section>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-brand-black text-white">
          <p role="status" className="text-brand-textMuted">
            Ładowanie strony…
          </p>
        </main>
      }
    >
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tutors" element={<TutorSearch />} />
        <Route
          path="/login"
          element={
            !loading && user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/register"
          element={
            !loading && user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <RegisterPage />
            )
          }
        />
        <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
