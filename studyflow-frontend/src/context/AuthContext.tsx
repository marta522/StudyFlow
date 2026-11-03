import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api, { clearCsrfToken } from "../api/axios";
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
  const queryClient = useQueryClient();
  const [authEnabled, setAuthEnabled] = useState(true);
  useEffect(() => {
    localStorage.removeItem("token");
  }, []);
  const profileQuery = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: async () => {
      const { data } = await api.get<User>("/auth/profile");
      return data;
    },
    enabled: authEnabled,
    retry: false,
    staleTime: 30_000,
  });
  const user = profileQuery.data ?? null;
  const loading = authEnabled && profileQuery.isPending;
  const authError =
    profileQuery.error &&
    !(
      axios.isAxiosError(profileQuery.error) &&
      [401, 403].includes(profileQuery.error.response?.status ?? 0)
    )
      ? getErrorMessage(profileQuery.error)
      : null;

  const login = useCallback((newUser: User) => {
    setAuthEnabled(true);
    queryClient.setQueryData(["auth", "profile"], newUser);
  }, [queryClient]);

  const logout = useCallback(() => {
    setAuthEnabled(false);
    clearCsrfToken();
    queryClient.removeQueries({ queryKey: ["auth", "profile"] });
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, loading, authError, login, logout }),
    [user, loading, authError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
