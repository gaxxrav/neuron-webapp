"use client";

import { useEffect, useState } from "react";

import { msUntilNextLocalMidnight, todayKey } from "./dates";

/**
 * The current local date as `YYYY-MM-DD`, re-rendering only when the day rolls
 * over. One timer is armed for the next local midnight rather than polling, so
 * countdowns sit idle all day and refresh exactly once when the date changes
 * (or immediately when the tab is refocused after being away past midnight).
 */
export function useToday(): string {
  const [day, setDay] = useState(todayKey);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const sync = () => {
      setDay((current) => {
        const next = todayKey();
        return next === current ? current : next;
      });
      timer = setTimeout(sync, msUntilNextLocalMidnight());
    };

    timer = setTimeout(sync, msUntilNextLocalMidnight());

    // A laptop asleep past midnight never fires the timer on time, so re-check
    // whenever the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        sync();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return day;
}
