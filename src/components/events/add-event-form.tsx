"use client";

import { useState, useTransition } from "react";

import { createEvent } from "@/lib/actions";
import { todayKey } from "@/lib/dates";

export function AddEventForm() {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!title.trim() || !endDate) return;
    if (endDate < startDate) {
      setError("The end date is before the start date.");
      return;
    }

    startTransition(async () => {
      try {
        await createEvent({ title, startDate, endDate });
        setTitle("");
        setEndDate("");
        setStartDate(todayKey());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add that event.");
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-3 shadow-sm"
    >
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add an event…"
          aria-label="Event name"
          className="min-w-0 flex-1 rounded-lg bg-surface-muted px-3 py-2 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={pending || !title.trim() || !endDate}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
        <label className="flex items-center gap-2">
          from
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
            className="rounded-lg bg-surface-muted px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
        <label className="flex items-center gap-2">
          until
          <input
            type="date"
            required
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="End date"
            className="rounded-lg bg-surface-muted px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-priority">
          {error}
        </p>
      ) : null}
    </form>
  );
}
