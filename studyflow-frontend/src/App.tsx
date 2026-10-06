import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { DashboardPage } from "./pages/DashboardPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TutorSearch } from "./components/TutorSearch";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, user, loading, authError, logout } = useAuth();

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

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const { token, user, loading } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/tutors" element={<TutorSearch />} />
      <Route
        path="/login"
        element={
          !loading && token && user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/register"
        element={
          !loading && token && user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage />
          )
        }
      />
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
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
