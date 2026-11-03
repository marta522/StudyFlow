import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  login: vi.fn(),
}));

vi.mock("../api/axios", () => ({ default: { post: mocks.post } }));
vi.mock("../context/useAuth", () => ({
  useAuth: () => ({ login: mocks.login }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("authenticates with the session cookie and enters the dashboard", async () => {
    const user = userEvent.setup();
    const authenticatedUser = {
      id: 5,
      first_name: "Ada",
      last_name: "Lovelace",
      email: "ada@example.com",
      role: "student",
    };
    mocks.post.mockResolvedValue({ data: { user: authenticatedUser } });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Adres email"), "ada@example.com");
    await user.type(screen.getByLabelText("Hasło"), "Password1");
    await user.click(screen.getByRole("button", { name: /zaloguj się/i }));

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(mocks.post).toHaveBeenCalledWith("/auth/login", {
      email: "ada@example.com",
      password: "Password1",
    });
    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith(authenticatedUser);
    });
  });
});
