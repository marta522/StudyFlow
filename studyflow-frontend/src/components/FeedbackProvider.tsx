import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FeedbackContext,
  type ToastType,
} from "./feedback-context";

interface ConfirmationRequest {
  message: string;
  resolve: (confirmed: boolean) => void;
}

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] =
    useState<ConfirmationRequest | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextToastId = useRef(0);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback((message: string) => {
    return new Promise<boolean>((resolve) => {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setConfirmation({ message, resolve });
    });
  }, []);

  const notify = useCallback(
    (message: string, type: ToastMessage["type"] = "success") => {
      const id = ++nextToastId.current;
      setToasts((current) => [...current, { id, message, type }]);
      window.setTimeout(
        () => setToasts((current) => current.filter((toast) => toast.id !== id)),
        5000,
      );
    },
    [],
  );

  const finishConfirmation = useCallback((confirmed: boolean) => {
    setConfirmation((current) => {
      current?.resolve(confirmed);
      return null;
    });
    previousFocusRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    cancelButtonRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") finishConfirmation(false);
      if (event.key === "Tab") {
        const cancel = cancelButtonRef.current;
        const confirmButton = confirmButtonRef.current;
        if (
          event.shiftKey &&
          document.activeElement === cancel &&
          confirmButton
        ) {
          event.preventDefault();
          confirmButton.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === confirmButton &&
          cancel
        ) {
          event.preventDefault();
          cancel.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirmation, finishConfirmation]);

  return (
    <FeedbackContext.Provider value={{ confirm, notify }}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-100 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            className={`rounded-xl border p-4 text-sm shadow-xl ${
              toast.type === "error"
                ? "border-red-500/50 bg-brand-card text-red-200"
                : "border-brand-yellow/60 bg-brand-card text-brand-yellow"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
      {confirmation && (
        <div
          className="fixed inset-0 z-90 grid place-items-center bg-black/70 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) finishConfirmation(false);
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            aria-describedby="confirmation-message"
            className="w-full max-w-md rounded-2xl border border-brand-cardBorder bg-brand-card p-6 text-white shadow-2xl"
          >
            <h2 id="confirmation-title" className="text-lg font-bold">
              Potwierdź działanie
            </h2>
            <p id="confirmation-message" className="mt-3 whitespace-pre-line text-sm leading-6 text-brand-textMuted">
              {confirmation.message}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={() => finishConfirmation(false)}
                className="rounded-lg border border-brand-cardBorder px-4 py-2 text-sm font-semibold hover:border-brand-yellow focus-visible:ring-2 focus-visible:ring-brand-yellow"
              >
                Anuluj
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => finishConfirmation(true)}
                className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-brand-black hover:bg-brand-yellowHover focus-visible:ring-2 focus-visible:ring-white"
              >
                Potwierdź
              </button>
            </div>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
