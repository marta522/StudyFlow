import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";

export type UserStatus = "ACTIVE" | "BLOCKED";
export type UserRole = "student" | "tutor";

export interface UserItem {
  id_users: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: UserStatus;
  role: { name: UserRole };
}

const USERS_QUERY_KEY = ["users", "managed"] as const;

export function useUsers() {
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const { data } = await api.get<UserItem[]>("/users");
      return data;
    },
    staleTime: 30_000,
  });

  const setUsers = useCallback(
    (update: UserItem[] | ((previous: UserItem[]) => UserItem[])) => {
      queryClient.setQueryData<UserItem[]>(
        USERS_QUERY_KEY,
        (previous) =>
          typeof update === "function" ? update(previous ?? []) : update,
      );
    },
    [queryClient],
  );
  const fetchUsers = useCallback(async () => {
    await refetch({ throwOnError: true });
  }, [refetch]);

  return {
    users: data ?? [],
    loading: isPending,
    error,
    setUsers,
    fetchUsers,
  };
}
