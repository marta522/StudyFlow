import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../api/axios";
import { AuthContext } from "./auth-context";
import type { User } from "./auth-context";

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message.join(", ");
    }
    if (message) {
      return message;
    }
  }

  return "Nie udało się przywrócić sesji. Sprawdź połączenie z serwerem.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("token"),
  );
  const [loading, setLoading] = useState(() => Boolean(token));
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    api
      .get<User>("/auth/profile")
      .then(({ data }) => {
        if (!cancelled) {
          setUser(data);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          localStorage.removeItem("token");
          setLoading(false);
          setToken(null);
          setUser(null);
          return;
        }

        setAuthError(getErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("token", newToken);
    setAuthError(null);
    setUser(newUser);
    setLoading(false);
    setToken(newToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setAuthError(null);
    setUser(null);
    setLoading(false);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, authError, login, logout }),
    [user, token, loading, authError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
