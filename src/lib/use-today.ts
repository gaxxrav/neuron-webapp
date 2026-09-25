"use client";

import { useSyncExternalStore } from "react";

import { msUntilNextLocalMidnight, todayKey } from "./dates";

/**
 * Notifies React when the local calendar day rolls over. One timer is armed
 * for the next local midnight rather than polling, so countdowns sit idle all
 * day and wake exactly once when the date changes.
 */
function subscribe(onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout>;

  const arm = () => {
    timer = setTimeout(() => {
      onChange();
      arm();
    }, msUntilNextLocalMidnight());
  };
  arm();

  // A laptop asleep past midnight never fires its timer on time, so re-check
  // whenever the tab becomes visible again.
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      clearTimeout(timer);
      onChange();
      arm();
    }
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

const getSnapshot = () => todayKey();

// "Today" depends on the viewer's timezone, which the server cannot know: it
// would render its own date (UTC on Vercel) and disagree with the browser.
// Returning null for both the server render and hydration keeps them identical;
// React swaps in the real date immediately afterwards.
const getServerSnapshot = () => null;

/**
 * The current local date as `YYYY-MM-DD`, or null until hydration completes.
 * Re-renders only when the day changes, never on an ordinary render.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
