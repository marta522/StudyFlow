import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export interface Person {
  first_name: string;
  last_name: string;
  email?: string;
}

export interface Booking {
  id_bookings: number;
  booking_date: string;
  status: string;
  note?: string | null;
  cancelled_by_user?: Person | null;
  lesson: {
    id_lessons: number;
    lesson_date: string;
    start_time: string;
    end_time: string;
    status: string;
    homework?: string | null;
    cancelled_at?: string | null;
    cancelled_by_user?: Person | null;
    subject: { name: string };
    tutor?: Person;
  };
  student?: Person;
}

export function useBookings<T = Booking>(userId: number | undefined) {
  return useQuery({
    queryKey: ["bookings", userId],
    queryFn: async () => {
      const { data } = await api.get<T[]>("/bookings/my-bookings");
      return data;
    },
    enabled: userId !== undefined,
    staleTime: 30_000,
  });
}
