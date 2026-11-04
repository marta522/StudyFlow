import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../api/axios";

interface Subject {
  id_subjects: number;
  name: string;
}

export interface ScheduleLesson {
  id_lessons: number;
  tutor_id: number;
  subject_id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  status: string;
  cancelled_at: string | null;
  cancelled_by_user: { first_name: string; last_name: string } | null;
  subject: Subject;
  tutor: { first_name: string; last_name: string };
  bookings: {
    status: string;
    student: { id_users: number; first_name: string; last_name: string };
  }[];
}

export interface ManagedUser {
  id_users: number;
  first_name: string;
  last_name: string;
  email: string;
  role: { name: "student" | "tutor" };
}

export interface ManagedSubject extends Subject {
  tutor_subjects: { tutor_id: number }[];
}

export interface ScheduleLessonPayload {
  tutor_id: number;
  student_id?: number;
  subject_id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
}

export function useAdminSchedule(scheduleParams: Record<string, string>) {
  const queryClient = useQueryClient();
  const scheduleQuery = useQuery({
    queryKey: ["admin-schedule", "lessons", scheduleParams],
    queryFn: async () => {
      const { data } = await api.get<ScheduleLesson[]>("/bookings/schedule", {
        params: scheduleParams,
      });
      return data;
    },
    staleTime: 30_000,
  });
  const optionsQuery = useQuery({
    queryKey: ["admin-schedule", "options"],
    queryFn: async () => {
      const [subjectResponse, managedSubjectResponse, userResponse] =
        await Promise.all([
          api.get<Subject[]>("/subjects"),
          api.get<ManagedSubject[]>("/subjects/admin"),
          api.get<ManagedUser[]>("/users"),
        ]);
      return {
        subjects: subjectResponse.data,
        offeredSubjects: managedSubjectResponse.data,
        users: userResponse.data,
      };
    },
    staleTime: 30_000,
  });

  async function fetchLessons(params: Record<string, string>) {
    return queryClient.fetchQuery({
      queryKey: ["admin-schedule", "lessons", params],
      queryFn: async () => {
        const { data } = await api.get<ScheduleLesson[]>(
          "/bookings/schedule",
          { params },
        );
        return data;
      },
      staleTime: 30_000,
    });
  }

  async function saveLesson(
    editingLessonId: number | null,
    payload: ScheduleLessonPayload,
  ) {
    if (editingLessonId) {
      await api.patch(
        `/bookings/admin/lessons/${editingLessonId}`,
        payload,
      );
    } else {
      await api.post("/bookings/admin/lessons", payload);
    }
    await invalidateLessons();
  }

  async function cancelLesson(lessonId: number) {
    await api.delete(`/bookings/admin/lessons/${lessonId}`);
    await invalidateLessons();
  }

  async function invalidateLessons() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-schedule", "lessons"],
    });
  }

  return {
    scheduleQuery,
    optionsQuery,
    fetchLessons,
    saveLesson,
    cancelLesson,
  };
}
