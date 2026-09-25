"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";

import { DayBoxes } from "@/components/events/day-boxes";
import { ChevronIcon, GripIcon, TrashIcon } from "@/components/icons";
import { deleteEvent, setEventCollapsed, updateEvent } from "@/lib/actions";
import {
  eventProgress,
  daysBetween,
  formatDateLabel,
  formatRemaining,
} from "@/lib/dates";
import type { EventItem } from "@/lib/types";

export function EventCard({
  event,
  today,
}: {
  event: EventItem;
  /** Today's local date, or null before mount. Changes only when the day does. */
  today: string | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: event.id });

  const [collapsed, setCollapsed] = useState(event.collapsed);
  const [editing, setEditing] = useState(false);
  const [endDate, setEndDate] = useState(event.end_date);
  const [, startTransition] = useTransition();

  // The span is fixed, but how much of it has elapsed depends on the viewer's
  // timezone, so it stays neutral until `today` arrives on the client.
  const progress = today
    ? eventProgress(event.start_date, event.end_date, today)
    : null;
  const totalDays = Math.max(
    1,
    daysBetween(event.start_date, event.end_date),
  );

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(() => setEventCollapsed(event.id, next));
  }

  function saveEndDate(e: React.FormEvent) {
    e.preventDefault();
    setEditing(false);
    if (!endDate || endDate === event.end_date) return;
    startTransition(() => updateEvent(event.id, { endDate }));
  }

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group rounded-xl border border-border bg-surface shadow-sm transition ${
        isDragging ? "z-10 opacity-70 shadow-lg" : ""
      }`}
    >
      <header className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${event.title}`}
          className="cursor-grab touch-none rounded p-2.5 text-muted/50 sm:p-1 hover-capable:opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        >
          <GripIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${event.title}` : `Collapse ${event.title}`}
          className="rounded p-2.5 text-muted transition hover:text-foreground sm:p-1"
        >
          <ChevronIcon
            className={`size-4 transition-transform ${collapsed ? "" : "rotate-90"}`}
          />
        </button>

        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold tracking-tight">
          {event.title}
        </h2>

        {event.work_item_id ? (
          <span
            title="Linked to a task"
            className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted"
          >
            linked
          </span>
        ) : null}

        <span
          className={`shrink-0 px-1 text-xs font-medium tabular-nums ${
            progress?.isOver ? "text-muted" : "text-accent"
          }`}
        >
          {progress ? formatRemaining(progress.remainingDays) : "\u00a0"}
        </span>

        <button
          type="button"
          onClick={() => {
            // The inverse case: removing an event never touches the work
            // item it came from.
            const message = event.work_item_id
              ? `Remove \u201c${event.title}\u201d from the visualisation? The task stays in your list.`
              : `Delete the event \u201c${event.title}\u201d?`;
            if (window.confirm(message)) {
              startTransition(() => deleteEvent(event.id));
            }
          }}
          aria-label={`Remove ${event.title} from the visualisation`}
          title="Remove from visualisation"
          className="shrink-0 rounded p-2.5 text-muted/50 sm:p-1 hover-capable:opacity-0 transition hover:text-priority group-hover:opacity-100 focus-visible:opacity-100"
        >
          <TrashIcon className="size-4" />
        </button>
      </header>

      {collapsed ? null : (
        <div className="flex flex-col gap-3 px-3 pb-3">
          <DayBoxes totalDays={totalDays} elapsedDays={progress?.elapsedDays ?? 0} />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="tabular-nums">
              {progress ? `${progress.elapsedDays} / ${totalDays} days · ${progress.percent}%` : `${totalDays} days`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDateLabel(event.start_date)}</span>
            <span aria-hidden="true">→</span>

            {editing ? (
              <form onSubmit={saveEndDate} className="flex items-center gap-2">
                <input
                  type="date"
                  autoFocus
                  value={endDate}
                  min={event.start_date}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="End date"
                  className="rounded bg-surface-muted px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-accent/40"
                />
                <button type="submit" className="font-medium text-accent">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEndDate(event.end_date);
                    setEditing(false);
                  }}
                  className="hover:text-foreground"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Change the end date"
                className="underline decoration-dotted underline-offset-2 hover:text-foreground"
              >
                {formatDateLabel(event.end_date)}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
