import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LessonsList } from "./LessonsList";
import { FeedbackProvider } from "./FeedbackProvider";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../api/axios", () => ({
  default: { get: mocks.get, post: mocks.post },
}));
vi.mock("../context/useAuth", () => ({
  useAuth: () => ({ user: { id: 12, role: "student" } }),
}));

describe("LessonsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({
      data: [
        {
          id_lessons: 31,
          lesson_date: "2030-10-10",
          start_time: "14:00",
          end_time: "15:00",
          subject: { id_subjects: 2, name: "Matematyka" },
          tutor: { id_users: 3, first_name: "Jan", last_name: "Kowalski" },
        },
      ],
    });
    mocks.post.mockResolvedValue({ data: {} });
  });

  it("books an available lesson and confirms success", async () => {
    const user = userEvent.setup();
    render(
      <FeedbackProvider>
        <LessonsList />
      </FeedbackProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "Zarezerwuj" }));

    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith("/bookings/book", {
        lesson_id: 31,
      });
    });
    expect(
      await screen.findAllByText("Pomyślnie zarezerwowano lekcję!"),
    ).not.toHaveLength(0);
  });
});
