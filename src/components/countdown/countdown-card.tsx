"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";

import { DayBoxes } from "@/components/countdown/day-boxes";
import { ChevronIcon, GripIcon, TrashIcon } from "@/components/icons";
import { deleteCountdown, setCountdownCollapsed, updateCountdown } from "@/lib/actions";
import { countdownProgress, formatDateLabel, formatRemaining } from "@/lib/dates";
import type { Countdown } from "@/lib/types";

export function CountdownCard({
  countdown,
  today,
}: {
  countdown: Countdown;
  /** Today's local date, recomputed only when the day rolls over. */
  today: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: countdown.id });

  const [collapsed, setCollapsed] = useState(countdown.collapsed);
  const [editing, setEditing] = useState(false);
  const [endDate, setEndDate] = useState(countdown.end_date);
  const [, startTransition] = useTransition();

  const progress = countdownProgress(
    countdown.start_date,
    countdown.end_date,
    today,
  );

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(() => setCountdownCollapsed(countdown.id, next));
  }

  function saveEndDate(event: React.FormEvent) {
    event.preventDefault();
    setEditing(false);
    if (!endDate || endDate === countdown.end_date) return;
    startTransition(() => updateCountdown(countdown.id, { endDate }));
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
          aria-label={`Reorder ${countdown.title}`}
          className="cursor-grab touch-none rounded p-1 text-muted/50 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        >
          <GripIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${countdown.title}` : `Collapse ${countdown.title}`}
          className="rounded p-1 text-muted transition hover:text-foreground"
        >
          <ChevronIcon
            className={`size-4 transition-transform ${collapsed ? "" : "rotate-90"}`}
          />
        </button>

        <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold tracking-tight">
          {countdown.title}
        </h2>

        {countdown.work_item_id ? (
          <span
            title="Linked to a work item"
            className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted"
          >
            linked
          </span>
        ) : null}

        <span
          className={`shrink-0 px-1 text-xs font-medium tabular-nums ${
            progress.isOver ? "text-muted" : "text-accent"
          }`}
        >
          {formatRemaining(progress.remainingDays)}
        </span>

        <button
          type="button"
          onClick={() => startTransition(() => deleteCountdown(countdown.id))}
          aria-label={`Remove ${countdown.title} from the visualisation`}
          title="Remove from visualisation"
          className="shrink-0 rounded p-1 text-muted/50 opacity-0 transition hover:text-priority group-hover:opacity-100 focus-visible:opacity-100"
        >
          <TrashIcon className="size-4" />
        </button>
      </header>

      {collapsed ? null : (
        <div className="flex flex-col gap-3 px-3 pb-3">
          <DayBoxes
            totalDays={progress.totalDays}
            elapsedDays={progress.elapsedDays}
          />

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="tabular-nums">
              {progress.elapsedDays} / {progress.totalDays} days ·{" "}
              {progress.percent}%
            </span>
            <span aria-hidden="true">·</span>
            <span>{formatDateLabel(countdown.start_date)}</span>
            <span aria-hidden="true">→</span>

            {editing ? (
              <form onSubmit={saveEndDate} className="flex items-center gap-2">
                <input
                  type="date"
                  autoFocus
                  value={endDate}
                  min={countdown.start_date}
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
                    setEndDate(countdown.end_date);
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
                {formatDateLabel(countdown.end_date)}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
