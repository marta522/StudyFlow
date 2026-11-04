import { useCallback } from "react";
import api from "../api/axios";

export function useLessonIssues() {
  return useCallback(
    async (lessonId: number, title: string, description: string) => {
      await api.post("/lesson-issues", {
        lesson_id: lessonId,
        title,
        description,
      });
    },
    [],
  );
}
