// All event maths is done on calendar days in the viewer's local timezone,
// never on timestamps. An event only changes when the local date rolls over,
// which is what lets us recompute once per day instead of on every render.

const MS_PER_DAY = 86_400_000;

/** Local calendar date as `YYYY-MM-DD`. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** Parses `YYYY-MM-DD` as local midnight (not UTC, which `new Date(s)` does). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from `a` to `b`; negative when `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  const from = fromDateKey(a);
  const to = fromDateKey(b);
  // Normalise away any DST offset introduced between the two local midnights.
  const utcFrom = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utcTo = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((utcTo - utcFrom) / MS_PER_DAY);
}

/** Milliseconds until the next local midnight, so we can schedule one timer. */
export function msUntilNextLocalMidnight(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1000, next.getTime() - now.getTime());
}

export type EventProgress = {
  /** Total boxes to draw: one per day of the span. Always at least 1. */
  totalDays: number;
  /** Boxes already filled, clamped to the span. */
  elapsedDays: number;
  /** Days left until the end date. Negative once the date has passed. */
  remainingDays: number;
  /** 0–100, for progress bars and labels. */
  percent: number;
  hasStarted: boolean;
  isOver: boolean;
};

export function eventProgress(
  startDate: string,
  endDate: string,
  today: string,
): EventProgress {
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const rawElapsed = daysBetween(startDate, today);
  const elapsedDays = Math.min(Math.max(rawElapsed, 0), totalDays);
  const remainingDays = daysBetween(today, endDate);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    percent: Math.round((elapsedDays / totalDays) * 100),
    hasStarted: rawElapsed >= 0,
    isOver: remainingDays < 0,
  };
}

/** "12 days left" / "today" / "3 days ago", for the headline label. */
export function formatRemaining(remainingDays: number): string {
  if (remainingDays === 0) return "today";
  if (remainingDays === 1) return "1 day left";
  if (remainingDays > 1) return `${remainingDays} days left`;
  const past = Math.abs(remainingDays);
  return past === 1 ? "1 day ago" : `${past} days ago`;
}

export function formatDateLabel(key: string): string {
  // A fixed locale, not the ambient one: Node and the browser resolve
  // `undefined` differently, which would differ across hydration.
  return fromDateKey(key).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
