import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { FeedbackProvider } from "./FeedbackProvider";
import { useFeedback } from "./useFeedback";

function ConfirmAction() {
  const { confirm } = useFeedback();
  const requestConfirmation = async () => {
    const confirmed = await confirm("Czy wykonać działanie?");
    document.body.dataset.confirmed = String(confirmed);
  };
  return (
    <button type="button" onClick={() => void requestConfirmation()}>
      Usuń
    </button>
  );
}

function ToastActions() {
  const { notify } = useFeedback();
  return (
    <>
      <button type="button" onClick={() => notify("Saved")}>
        Pokaż sukces
      </button>
      <button type="button" onClick={() => notify("Failed", "error")}>
        Pokaż błąd
      </button>
    </>
  );
}

afterEach(() => {
  cleanup();
  delete document.body.dataset.confirmed;
});

describe("FeedbackProvider", () => {
  it("shows an accessible confirmation dialog and resolves the decision", async () => {
    const user = userEvent.setup();
    render(
      <FeedbackProvider>
        <ConfirmAction />
      </FeedbackProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Usuń" }));
    expect(screen.getByRole("alertdialog")).toHaveAccessibleName(
      "Potwierdź działanie",
    );
    expect(screen.getByText("Czy wykonać działanie?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Anuluj" }));
    expect(document.body.dataset.confirmed).toBe("false");
  });

  it("resolves the confirmation when accepted", async () => {
    const user = userEvent.setup();
    render(
      <FeedbackProvider>
        <ConfirmAction />
      </FeedbackProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Usuń" }));
    await user.click(screen.getByRole("button", { name: "Potwierdź" }));

    expect(document.body.dataset.confirmed).toBe("true");
  });

  it("exposes success and failure messages as visible toasts", async () => {
    const user = userEvent.setup();
    render(
      <FeedbackProvider>
        <ToastActions />
      </FeedbackProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Pokaż sukces" }));
    await user.click(screen.getByRole("button", { name: "Pokaż błąd" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  });
});
