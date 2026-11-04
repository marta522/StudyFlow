import { useCallback } from "react";
import api from "../api/axios";

export interface StudentGradeRecord {
  id_monthly_grades: number;
  month: number;
  year: number;
  grade: number | string;
  comment: string | null;
  created_at: string;
  lesson: { lesson_date: string } | null;
  subject: { id_subjects: number; name: string };
  tutor: { first_name: string; last_name: string };
}

export function useTutorStudentActions() {
  const addGrade = useCallback(
    async (lessonId: number, grade: number, comment?: string) => {
      await api.post("/grades", {
        lesson_id: lessonId,
        grade,
        comment,
      });
    },
    [],
  );

  const loadStudentGrades = useCallback(async (studentId: number) => {
    const { data } = await api.get<StudentGradeRecord[]>(
      `/grades/student/${studentId}`,
    );
    return data;
  }, []);

  const markAttendance = useCallback(
    async (bookingId: number, present: boolean) => {
      await api.post("/attendance", { booking_id: bookingId, present });
    },
    [],
  );

  return { addGrade, loadStudentGrades, markAttendance };
}
