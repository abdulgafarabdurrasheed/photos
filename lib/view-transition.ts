"use client";

import { flushSync } from "react-dom";

export function supportsViewTransitions() {
  return (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    typeof (document as Document & { startViewTransition?: unknown })
      .startViewTransition === "function"
  );
}

export function startViewTransition(update: () => void) {
  if (!supportsViewTransitions()) {
    update();
    return;
  }
  (
    document as Document & {
      startViewTransition: (callback: () => void) => void;
    }
  ).startViewTransition(() => {
    flushSync(update);
  });
}
