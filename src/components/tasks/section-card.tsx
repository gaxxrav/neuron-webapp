"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition } from "react";

import { ChevronIcon, GripIcon, TrashIcon } from "@/components/icons";
import { WorkItemRow } from "@/components/tasks/work-item-row";
import { deleteSection, renameSection, setSectionCollapsed } from "@/lib/actions";
import type { Section, WorkItem } from "@/lib/types";

export const containerId = (sectionId: string) => `container:${sectionId}`;

type Props = {
  section: Section;
  items: WorkItem[];
  visualisedItemIds: Set<string>;
};

export function SectionCard({ section, items, visualisedItemIds }: Props) {
  const isPriority = section.kind === "priority";

  // The priority section is pinned to the top, so it is never draggable. The
  // hook still runs (hooks cannot be conditional) but is disabled.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: section.id,
      data: { type: "section" },
      disabled: isPriority,
    });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: containerId(section.id),
    data: { type: "container", sectionId: section.id },
  });

  // Collapse responds instantly and is persisted in the background.
  const [collapsed, setCollapsed] = useState(section.collapsed);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(section.name);
  const [, startTransition] = useTransition();

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    startTransition(() => setSectionCollapsed(section.id, next));
  }

  function commitRename() {
    setEditing(false);
    const next = draft.trim();
    if (!next || next === section.name) {
      setDraft(section.name);
      return;
    }
    startTransition(() => renameSection(section.id, next));
  }

  const remaining = items.filter((i) => !i.done).length;

  return (
    <section
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`rounded-xl border shadow-sm transition ${
        isPriority
          ? "border-priority-border bg-priority-soft"
          : "border-border bg-surface"
      } ${isDragging ? "z-10 opacity-70 shadow-lg" : ""} ${
        isOver ? "ring-2 ring-accent/40" : ""
      }`}
    >
      <header className="group/header flex items-center gap-1 px-2 py-2">
        {isPriority ? (
          <span className="w-6 shrink-0" aria-hidden="true" />
        ) : (
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${section.name} section`}
            className="cursor-grab touch-none rounded p-2.5 text-muted/50 sm:p-1 hover-capable:opacity-0 transition group-hover/header:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
          >
            <GripIcon className="size-4" />
          </button>
        )}

        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expand ${section.name}` : `Collapse ${section.name}`}
          className="rounded p-2.5 text-muted transition hover:text-foreground sm:p-1"
        >
          <ChevronIcon
            className={`size-4 transition-transform ${collapsed ? "" : "rotate-90"}`}
          />
        </button>

        {editing && !isPriority ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(section.name);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded bg-surface-muted px-1.5 py-0.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/40"
          />
        ) : (
          <button
            type="button"
            disabled={isPriority}
            onClick={() => {
              setDraft(section.name);
              setEditing(true);
            }}
            title={isPriority ? undefined : "Click to rename"}
            className={`min-w-0 flex-1 truncate px-1 py-0.5 text-left text-sm font-semibold tracking-tight ${
              isPriority ? "text-priority uppercase" : ""
            }`}
          >
            {section.name}
          </button>
        )}

        <span className="shrink-0 px-1 text-xs tabular-nums text-muted">
          {remaining}/{items.length}
        </span>

        {isPriority ? null : (
          <button
            type="button"
            onClick={() => {
              const ok = window.confirm(
                `Delete the “${section.name}” section and its ${items.length} item(s)?`,
              );
              if (ok) startTransition(() => deleteSection(section.id));
            }}
            aria-label={`Delete ${section.name} section`}
            className="shrink-0 rounded p-2.5 text-muted/50 sm:p-1 hover-capable:opacity-0 transition hover:text-priority group-hover/header:opacity-100 focus-visible:opacity-100"
          >
            <TrashIcon className="size-4" />
          </button>
        )}
      </header>

      {collapsed ? null : (
        <div ref={setDropRef} className="px-2 pb-2">
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="flex flex-col gap-0.5">
              {items.map((item) => (
                <WorkItemRow
                  key={item.id}
                  item={item}
                  visualised={visualisedItemIds.has(item.id)}
                  priority={isPriority}
                />
              ))}
            </ul>
          </SortableContext>

          {items.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted">
              Nothing here. Add an item, or drag one in.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
