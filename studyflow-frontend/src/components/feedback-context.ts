import { createContext } from "react";

export type ToastType = "success" | "error";

export interface FeedbackContextValue {
  confirm: (message: string) => Promise<boolean>;
  notify: (message: string, type?: ToastType) => void;
}

export const FeedbackContext =
  createContext<FeedbackContextValue | null>(null);
