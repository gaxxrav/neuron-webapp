"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";

import { ChartIcon, FlagIcon, GripIcon, TrashIcon } from "@/components/icons";
import {
  deleteWorkItem,
  renameWorkItem,
  setWorkItemDone,
  setWorkItemPriority,
  setWorkItemVisualised,
} from "@/lib/actions";
import { todayKey } from "@/lib/dates";
import type { WorkItem } from "@/lib/types";

type Props = {
  item: WorkItem;
  /** True when a countdown is already linked to this item. */
  visualised: boolean;
  priority: boolean;
};

export function WorkItemRow({ item, visualised, priority }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, data: { type: "item", sectionId: item.section_id } });

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const [dateOpen, setDateOpen] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [, startTransition] = useTransition();

  function commitRename() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === item.title) {
      setDraft(item.title);
      return;
    }
    startTransition(() => renameWorkItem(item.id, next));
  }

  function toggleVisualised() {
    if (visualised) {
      startTransition(() => setWorkItemVisualised(item.id, false));
    } else {
      setDateOpen((open) => !open);
    }
  }

  function confirmVisualise(event: React.FormEvent) {
    event.preventDefault();
    if (!endDate) return;
    setDateOpen(false);
    startTransition(() =>
      setWorkItemVisualised(item.id, true, endDate, todayKey()),
    );
    setEndDate("");
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group rounded-lg border border-transparent bg-surface transition ${
        isDragging ? "z-10 opacity-60 shadow-lg" : "hover:border-border"
      }`}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${item.title}`}
          className="cursor-grab touch-none text-muted/50 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        >
          <GripIcon className="size-4" />
        </button>

        <input
          type="checkbox"
          checked={item.done}
          aria-label={`Mark ${item.title} as done`}
          onChange={(e) => {
            const done = e.target.checked;
            startTransition(() => setWorkItemDone(item.id, done));
          }}
          className={`size-4 shrink-0 ${
            priority ? "accent-[var(--priority)]" : "accent-[var(--accent)]"
          }`}
        />

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(item.title);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded bg-surface-muted px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(item.title);
              setEditing(true);
            }}
            title="Click to rename"
            className={`min-w-0 flex-1 truncate px-1.5 py-0.5 text-left text-sm ${
              item.done ? "text-muted line-through" : ""
            }`}
          >
            {item.title}
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            startTransition(() => setWorkItemPriority(item.id, !priority))
          }
          aria-pressed={priority}
          title={priority ? "Remove from priority" : "Make priority"}
          className={`shrink-0 rounded p-1 transition ${
            priority
              ? "text-priority"
              : "text-muted/50 opacity-0 hover:text-priority group-hover:opacity-100 focus-visible:opacity-100"
          }`}
        >
          <FlagIcon className="size-4" filled={priority} />
        </button>

        <button
          type="button"
          onClick={toggleVisualised}
          aria-pressed={visualised}
          title={
            visualised
              ? "Remove from visualisation"
              : "Add to visualisation"
          }
          className={`shrink-0 rounded p-1 transition ${
            visualised
              ? "text-accent"
              : "text-muted/50 opacity-0 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
          }`}
        >
          <ChartIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => startTransition(() => deleteWorkItem(item.id))}
          title="Delete item"
          aria-label={`Delete ${item.title}`}
          className="shrink-0 rounded p-1 text-muted/50 opacity-0 transition hover:text-priority group-hover:opacity-100 focus-visible:opacity-100"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>

      {dateOpen ? (
        <form
          onSubmit={confirmVisualise}
          className="flex items-center gap-2 border-t border-border px-3 py-2 text-xs"
        >
          <span className="text-muted">Count down until</span>
          <input
            type="date"
            required
            autoFocus
            min={todayKey()}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Countdown end date"
            className="rounded bg-surface-muted px-2 py-1 outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="submit"
            className="rounded bg-accent px-2 py-1 font-medium text-white disabled:opacity-40"
            disabled={!endDate}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setDateOpen(false)}
            className="text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </form>
      ) : null}
    </li>
  );
}
