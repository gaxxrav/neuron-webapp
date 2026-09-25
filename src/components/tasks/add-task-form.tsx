"use client";

import { useState, useTransition } from "react";

import { createTask } from "@/lib/actions";
import { todayKey } from "@/lib/dates";
import type { Section } from "@/lib/types";

export function AddItemForm({ sections }: { sections: Section[] }) {
  const [title, setTitle] = useState("");
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [priority, setPriority] = useState(false);
  const [visualise, setVisualise] = useState(false);
  const [startDate, setStartDate] = useState(todayKey);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The selected section can disappear underneath us (deleted, or none chosen
  // yet), so always fall back to the first one that still exists.
  const activeSectionId = sections.some((s) => s.id === sectionId)
    ? sectionId
    : (sections[0]?.id ?? "");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) return;
    if (visualise && !endDate) {
      setError("Pick an end date, or untick “add to visualisation”.");
      return;
    }
    if (visualise && endDate < startDate) {
      setError("The end date is before the start date.");
      return;
    }

    const payload = {
      title,
      // Empty means "the server picks the default list".
      sectionId: priority ? "" : activeSectionId,
      priority,
      addToVisualisation: visualise,
      endDate: visualise ? endDate : undefined,
      startDate: visualise ? startDate : undefined,
    };

    startTransition(async () => {
      try {
        await createTask(payload);
        setTitle("");
        setVisualise(false);
        setPriority(false);
        setEndDate("");
        setStartDate(todayKey());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add that item.");
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
          placeholder="Add a task…"
          aria-label="Task title"
          className="min-w-0 flex-1 rounded-lg bg-surface-muted px-3 py-2 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
        />
        <button
          type="submit"
          disabled={pending || !title.trim()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-2 text-priority">
          <input
            type="checkbox"
            checked={priority}
            onChange={(e) => setPriority(e.target.checked)}
            className="size-4 accent-[var(--priority)]"
          />
          Mark as priority
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={visualise}
            onChange={(e) => setVisualise(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Add to visualisation
        </label>

        {!priority && sections.length > 0 ? (
          <label className="flex items-center gap-2 text-muted">
            <span>in</span>
            <select
              value={activeSectionId}
              onChange={(e) => setSectionId(e.target.value)}
              aria-label="Section"
              className="rounded-lg bg-surface-muted px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-accent/40"
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {visualise ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
          <label className="flex items-center gap-2 text-muted">
            from
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="EventItem start date"
              className="rounded-lg bg-surface-muted px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <label className="flex items-center gap-2 text-muted">
            until
            <input
              type="date"
              value={endDate}
              min={startDate}
              required
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="EventItem end date"
              className="rounded-lg bg-surface-muted px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-sm text-priority">
          {error}
        </p>
      ) : null}
    </form>
  );
}
