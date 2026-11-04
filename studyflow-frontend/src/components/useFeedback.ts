import { useContext } from "react";
import { FeedbackContext } from "./feedback-context";

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return value;
}
