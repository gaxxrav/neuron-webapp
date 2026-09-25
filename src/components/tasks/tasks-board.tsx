"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useRef, useState, useTransition } from "react";

import { AddItemForm } from "@/components/tasks/add-item-form";
import { AddSectionForm } from "@/components/tasks/add-section-form";
import { BoardProvider, type BoardActions } from "@/components/tasks/board-context";
import { SectionCard } from "@/components/tasks/section-card";
import {
  deleteWorkItem,
  renameWorkItem,
  reorderSections,
  reorderWorkItems,
  setWorkItemDone,
  setWorkItemPriority,
  setWorkItemVisualised,
} from "@/lib/actions";
import { todayKey } from "@/lib/dates";
import type { Section, WorkItem } from "@/lib/types";
import { useServerState } from "@/lib/use-server-state";

const CONTAINER_PREFIX = "container:";

type Props = {
  sections: Section[];
  items: WorkItem[];
  visualisedItemIds: string[];
};

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

export function TasksBoard({ sections, items, visualisedItemIds }: Props) {
  // Local mirrors of the server data so drags feel instant; each resets when
  // the server sends fresh rows after a revalidate.
  const [localSections, setLocalSections] = useServerState(sections);
  const [localItems, setLocalItems] = useServerState(items);
  const [localVisualised, setLocalVisualised] = useServerState(visualisedItemIds);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Section an item was picked up from, captured before drag-over relocates it.
  const dragOrigin = useRef<string | null>(null);

  const sensors = useSensors(
    // A small threshold keeps clicks on checkboxes and buttons from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const prioritySection = localSections.find((s) => s.kind === "priority") ?? null;
  const normalSections = localSections
    .filter((s) => s.kind === "normal")
    .sort(byPosition);

  const itemsIn = (sectionId: string) =>
    localItems.filter((i) => i.section_id === sectionId).sort(byPosition);

  const visualised = new Set(localVisualised);

  /**
   * Applies a change locally, fires the server action, and restores the
   * previous state if it fails. Without this the UI waits on a round trip
   * that includes re-validating the session and refetching the whole board.
   */
  function optimistic(
    apply: (current: WorkItem[]) => WorkItem[],
    persist: () => Promise<void>,
  ) {
    // Captured from the current render, not inside the updater: the updater
    // is not guaranteed to have run by the time the catch needs it.
    const snapshot = localItems;
    setLocalItems(apply);
    setError(null);
    startTransition(async () => {
      try {
        await persist();
      } catch (e) {
        // Rolling back silently made a failed write look like a no-op, with
        // the row simply reappearing and no explanation.
        setLocalItems(snapshot);
        setError(e instanceof Error ? e.message : "That change did not save.");
      }
    });
  }

  const boardActions: BoardActions = {
    toggleDone(id, done) {
      optimistic(
        (current) => current.map((i) => (i.id === id ? { ...i, done } : i)),
        () => setWorkItemDone(id, done),
      );
    },

    rename(id, title) {
      optimistic(
        (current) => current.map((i) => (i.id === id ? { ...i, title } : i)),
        () => renameWorkItem(id, title),
      );
    },

    remove(id) {
      setLocalVisualised((current) => current.filter((v) => v !== id));
      optimistic(
        (current) => current.filter((i) => i.id !== id),
        () => deleteWorkItem(id),
      );
    },

    togglePriority(id) {
      const item = localItems.find((i) => i.id === id);
      if (!item || !prioritySection) return;

      const isPriority = item.section_id === prioritySection.id;

      // Mirrors the server: demoting returns the item to where it came from,
      // falling back to the first ordinary section.
      const remembered = item.previous_section_id;
      const target = isPriority
        ? remembered && remembered !== prioritySection.id
          ? remembered
          : normalSections[0]?.id
        : prioritySection.id;

      // Only the server can conjure a default section, so let it round trip.
      if (!target) {
        startTransition(() => setWorkItemPriority(id, !isPriority));
        return;
      }

      const bottom =
        localItems
          .filter((i) => i.section_id === target)
          .reduce((max, i) => Math.max(max, i.position), -1) + 1;

      optimistic(
        (current) =>
          current.map((i) =>
            i.id === id
              ? {
                  ...i,
                  section_id: target,
                  previous_section_id: isPriority ? null : i.section_id,
                  position: bottom,
                }
              : i,
          ),
        () => setWorkItemPriority(id, !isPriority),
      );
    },

    setVisualised(id, on, endDate) {
      const snapshot = localVisualised;
      setLocalVisualised((current) =>
        on ? [...current, id] : current.filter((v) => v !== id),
      );
      startTransition(async () => {
        try {
          await setWorkItemVisualised(
            id,
            on,
            endDate,
            on ? todayKey() : undefined,
          );
        } catch (e) {
          setLocalVisualised(snapshot);
          setError(e instanceof Error ? e.message : "That change did not save.");
        }
      });
    },
  };

  function sectionOfItem(itemId: string): string | null {
    return localItems.find((i) => i.id === itemId)?.section_id ?? null;
  }

  /** Maps whatever is under the cursor onto the section it belongs to. */
  function resolveSection(overId: string): string | null {
    if (overId.startsWith(CONTAINER_PREFIX)) {
      return overId.slice(CONTAINER_PREFIX.length);
    }
    if (localSections.some((s) => s.id === overId)) return overId;
    return sectionOfItem(overId);
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setActiveId(id);
    dragOrigin.current =
      event.active.data.current?.type === "item" ? sectionOfItem(id) : null;
    document.body.classList.add("dragging");
  }

  /** Moves an item between sections live, while the pointer is still down. */
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "item") return;

    const activeItemId = String(active.id);
    const from = sectionOfItem(activeItemId);
    const to = resolveSection(String(over.id));
    if (!from || !to || from === to) return;

    setLocalItems((prev) => {
      const moving = prev.find((i) => i.id === activeItemId);
      if (!moving) return prev;

      const rest = prev.filter((i) => i.id !== activeItemId);
      const target = rest.filter((i) => i.section_id === to).sort(byPosition);
      const overIndex = target.findIndex((i) => i.id === String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : target.length;

      const nextTarget = [
        ...target.slice(0, insertAt),
        { ...moving, section_id: to },
        ...target.slice(insertAt),
      ].map((i, index) => ({ ...i, position: index }));

      const nextSource = rest
        .filter((i) => i.section_id === from)
        .sort(byPosition)
        .map((i, index) => ({ ...i, position: index }));

      const untouched = rest.filter(
        (i) => i.section_id !== to && i.section_id !== from,
      );
      return [...untouched, ...nextSource, ...nextTarget];
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const type = active.data.current?.type;
    const origin = dragOrigin.current;

    setActiveId(null);
    dragOrigin.current = null;
    document.body.classList.remove("dragging");

    if (!over) return;

    if (type === "section") {
      if (active.id === over.id) return;
      const ids = normalSections.map((s) => s.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));
      if (from < 0 || to < 0) return;

      const ordered = arrayMove(ids, from, to);
      setLocalSections((prev) =>
        prev.map((s) =>
          s.kind === "normal" ? { ...s, position: ordered.indexOf(s.id) } : s,
        ),
      );
      startTransition(() => reorderSections(ordered));
      return;
    }

    if (type !== "item") return;

    const activeItemId = String(active.id);
    const target = resolveSection(String(over.id));
    if (!target) return;

    const currentIds = itemsIn(target).map((i) => i.id);
    const from = currentIds.indexOf(activeItemId);
    const overIndex = currentIds.indexOf(String(over.id));
    const to = overIndex >= 0 ? overIndex : currentIds.length - 1;

    const ordered =
      from >= 0 && to >= 0 && from !== to
        ? arrayMove(currentIds, from, to)
        : currentIds;

    setLocalItems((prev) =>
      prev.map((i) =>
        ordered.includes(i.id)
          ? { ...i, section_id: target, position: ordered.indexOf(i.id) }
          : i,
      ),
    );

    // When the item crossed sections, the section it left needs its remaining
    // positions compacted too.
    const sourceIds =
      origin && origin !== target
        ? itemsIn(origin)
            .map((i) => i.id)
            .filter((id) => id !== activeItemId)
        : null;

    startTransition(async () => {
      await reorderWorkItems(target, ordered);
      if (origin && sourceIds) await reorderWorkItems(origin, sourceIds);
    });
  }

  const activeItem = localItems.find((i) => i.id === activeId) ?? null;
  const activeSection = localSections.find((s) => s.id === activeId) ?? null;

  return (
    <BoardProvider value={boardActions}>
      <div className="flex flex-col gap-4">
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-priority-border bg-priority-soft px-3 py-2 text-sm text-priority"
          >
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="shrink-0 font-medium underline underline-offset-2"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <AddItemForm sections={normalSections} />

        <DndContext
          // Explicit id: without it dnd-kit derives its aria-describedby id from
          // an internal counter that starts at a different value on the server
          // than in the browser, which trips a hydration mismatch.
          id="tasks-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            dragOrigin.current = null;
            document.body.classList.remove("dragging");
          }}
        >
          <div className="flex flex-col gap-3">
            {/* Pinned above everything and never part of the sortable list. */}
            {prioritySection ? (
              <SectionCard
                section={prioritySection}
                items={itemsIn(prioritySection.id)}
                visualisedItemIds={visualised}
              />
            ) : null}

            <SortableContext
              items={normalSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {normalSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  items={itemsIn(section.id)}
                  visualisedItemIds={visualised}
                />
              ))}
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeItem ? (
              <div className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm shadow-lg">
                {activeItem.title}
              </div>
            ) : activeSection ? (
              <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold shadow-lg">
                {activeSection.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <AddSectionForm />

        {normalSections.length === 0 && itemsIn(prioritySection?.id ?? "").length === 0 ? (
          <p className="px-1 text-xs text-muted">
            Tip: add a section to group your work items, then drag sections to
            reorder them. The priority section always stays on top.
          </p>
        ) : null}
      </div>
    </BoardProvider>
  );
}
