import { useCallback } from "react";
import api from "../api/axios";
import type { UserItem, UserRole, UserStatus } from "./useUsers";

export interface UserActivity {
  user: {
    created_at: string;
    bookings_as_student: {
      lesson: {
        id_lessons: number;
        lesson_date: string;
        start_time: string;
        end_time: string;
        status: string;
        subject: { name: string };
        tutor: { first_name: string; last_name: string };
      };
    }[];
    lessons_as_tutor: {
      id_lessons: number;
      lesson_date: string;
      start_time: string;
      end_time: string;
      status: string;
      subject: { name: string };
    }[];
  };
  bookingCount: number;
  tutoringLessonCount: number;
  reviewCount: number;
  gradeCount: number;
  auditEvents: {
    id_admin_audit_logs: number;
    action: string;
    entity_type: string;
    entity_id: number | null;
    details: string;
    created_at: string;
    actor: { first_name: string; last_name: string } | null;
  }[];
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface UpdateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
}

export function useManagedUserOperations() {
  const updateUser = useCallback(
    async (userId: number, payload: UpdateUserPayload) => {
      const { data } = await api.patch<UserItem>(`/users/${userId}`, payload);
      return data;
    },
    [],
  );

  const createUser = useCallback(async (payload: CreateUserPayload) => {
    const { data } = await api.post<UserItem>("/users", payload);
    return data;
  }, []);

  const deleteTutor = useCallback(async (userId: number) => {
    const { data } = await api.delete<UserItem & { archived?: boolean }>(
      `/users/${userId}`,
    );
    return data;
  }, []);

  const updateUserStatus = useCallback(
    async (userId: number, status: UserStatus) => {
      const { data } = await api.patch<UserItem>(`/users/${userId}/status`, {
        status,
      });
      return data;
    },
    [],
  );

  const loadUserActivity = useCallback(async (userId: number) => {
    const { data } = await api.get<UserActivity>(`/users/${userId}/activity`);
    return data;
  }, []);

  return {
    updateUser,
    createUser,
    deleteTutor,
    updateUserStatus,
    loadUserActivity,
  };
}
