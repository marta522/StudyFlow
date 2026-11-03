import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./App";

vi.mock("./context/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    authError: null,
    logout: vi.fn(),
  }),
}));

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to login", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <p>Private dashboard</p>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Private dashboard")).not.toBeInTheDocument();
  });
});
