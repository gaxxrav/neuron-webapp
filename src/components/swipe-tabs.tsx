"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Left-to-right order of the tabs; a swipe moves one step along it. */
const TAB_ORDER = ["/tasks", "/events"] as const;

/** Horizontal distance before a drag counts as a swipe. */
const DISTANCE_THRESHOLD = 60;

/**
 * How much more horizontal than vertical the movement must be. Without this a
 * slightly-diagonal scroll would flip tabs while the user is reading.
 */
const DIRECTION_RATIO = 1.5;

/**
 * Starting a swipe on any of these would fight with what the element already
 * does — dnd-kit marks its drag handles with `aria-roledescription="sortable"`,
 * and form controls own their own horizontal drags (a date picker, a text
 * caret, a range input).
 */
const IGNORE_SELECTOR =
  '[aria-roledescription="sortable"], input, textarea, select, [contenteditable="true"]';

export function SwipeTabs({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const start = useRef<{ x: number; y: number; valid: boolean } | null>(null);

  // Keep the sibling tab warm so a swipe lands on a cached payload rather
  // than a fresh server render.
  useEffect(() => {
    for (const href of TAB_ORDER) {
      if (href !== pathname) router.prefetch(href);
    }
  }, [pathname, router]);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length !== 1) {
      start.current = null;
      return;
    }
    const touch = e.touches[0];
    const target = e.target as HTMLElement | null;
    start.current = {
      x: touch.clientX,
      y: touch.clientY,
      valid: !target?.closest(IGNORE_SELECTOR),
    };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const from = start.current;
    start.current = null;
    if (!from?.valid) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - from.x;
    const dy = touch.clientY - from.y;

    if (Math.abs(dx) < DISTANCE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy) * DIRECTION_RATIO) return;

    const index = TAB_ORDER.indexOf(pathname as (typeof TAB_ORDER)[number]);
    if (index === -1) return;

    // Swiping left moves forward through the tabs, as the content follows
    // the finger.
    const next = TAB_ORDER[dx < 0 ? index + 1 : index - 1];
    if (next) router.push(next);
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        start.current = null;
      }}
    >
      {children}
    </div>
  );
}
