import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

vi.mock("../context/useAuth", () => ({
  useAuth: () => ({
    user: { id: 1, role: "student", first_name: "Ala" },
  }),
}));

vi.mock("../components/Navbar", () => ({
  Navbar: ({
    activeTab,
    setActiveTab,
  }: {
    activeTab: string;
    setActiveTab: (tab: string) => void;
  }) => (
    <nav>
      <output data-testid="active-tab">{activeTab}</output>
      <button type="button" onClick={() => setActiveTab("stats")}>
        Oceny
      </button>
      <button type="button" onClick={() => setActiveTab("users")}>
        Użytkownicy
      </button>
    </nav>
  ),
}));

vi.mock("../components/MyBookings", () => ({
  MyBookings: () => <p>Widok harmonogramu</p>,
}));

vi.mock("../components/StudentStats", () => ({
  StudentStats: () => <p>Widok statystyk</p>,
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderDashboard(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <DashboardPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe("DashboardPage tab URL", () => {
  it("restores an allowed active tab from the URL", async () => {
    renderDashboard("/dashboard?tab=stats");

    expect(await screen.findByText("Widok statystyk")).toBeInTheDocument();
    expect(screen.getByTestId("active-tab")).toHaveTextContent("stats");
  });

  it("updates the URL and falls back when a tab is not allowed for the role", async () => {
    const user = userEvent.setup();
    renderDashboard("/dashboard?tab=users");

    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent(
        "tab=my-bookings",
      );
    });
    expect(screen.getByTestId("active-tab")).toHaveTextContent("my-bookings");

    await user.click(screen.getByRole("button", { name: "Oceny" }));
    await waitFor(() => {
      expect(screen.getByTestId("location-search")).toHaveTextContent(
        "tab=stats",
      );
    });
  });
});
