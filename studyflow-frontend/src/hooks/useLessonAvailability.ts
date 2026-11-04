import { useCallback } from "react";
import api from "../api/axios";

export interface AvailableLesson {
  id_lessons: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  subject: { id_subjects: number; name: string; description?: string | null };
  tutor: {
    id_users: number;
    first_name: string;
    last_name: string;
  };
}

export interface TutorSubjectOffer {
  id_tutor_subjects: number;
  subject: AvailableLesson["subject"];
}

export interface TutorAvailabilitySlot {
  id_availability: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface TutorStudent {
  id_users: number;
  first_name: string;
  last_name: string;
}

export interface TutorBooking {
  status: string;
  student: TutorStudent;
}

export interface LessonPayload {
  subject_id: number;
  lesson_date: string;
  start_time: string;
  end_time: string;
  student_id?: number;
}

export function useLessonAvailability() {
  const fetchLessons = useCallback(async () => {
    const { data } = await api.get<AvailableLesson[]>("/bookings/available");
    return data;
  }, []);

  const fetchTutorOffer = useCallback(async () => {
    const { data } = await api.get<TutorSubjectOffer[]>("/subjects/my-offer");
    return data;
  }, []);

  const fetchTutorAvailability = useCallback(async () => {
    const { data } = await api.get<TutorAvailabilitySlot[]>(
      "/tutors/me/availability",
    );
    return data;
  }, []);

  const fetchTutorStudents = useCallback(async () => {
    const { data } = await api.get<TutorBooking[]>("/bookings/my-bookings");
    const studentsById = new Map<number, TutorStudent>();
    data
      .filter((booking) => booking.status !== "CANCELLED")
      .forEach((booking) =>
        studentsById.set(booking.student.id_users, booking.student),
      );
    return [...studentsById.values()].sort((left, right) =>
      `${left.last_name} ${left.first_name}`.localeCompare(
        `${right.last_name} ${right.first_name}`,
        "pl",
      ),
    );
  }, []);

  const bookLesson = useCallback(async (lessonId: number) => {
    await api.post("/bookings/book", { lesson_id: lessonId });
  }, []);

  const saveLesson = useCallback(
    async (
      editingLessonId: number | null,
      payload: LessonPayload,
    ) => {
      if (editingLessonId === null) {
        await api.post("/bookings/lessons", payload);
      } else {
        await api.patch(`/bookings/lessons/${editingLessonId}`, payload);
      }
    },
    [],
  );

  const deleteLesson = useCallback(async (lessonId: number) => {
    await api.delete(`/bookings/lessons/${lessonId}`);
  }, []);

  return {
    fetchLessons,
    fetchTutorOffer,
    fetchTutorAvailability,
    fetchTutorStudents,
    bookLesson,
    saveLesson,
    deleteLesson,
  };
}
