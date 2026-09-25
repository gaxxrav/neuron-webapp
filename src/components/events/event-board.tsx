"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTransition } from "react";

import { AddEventForm } from "@/components/events/add-event-form";
import { EventCard } from "@/components/events/event-card";
import { reorderEvents } from "@/lib/actions";
import type { EventItem } from "@/lib/types";
import { useServerState } from "@/lib/use-server-state";
import { useToday } from "@/lib/use-today";

export function EventBoard({ events }: { events: EventItem[] }) {
  const [local, setLocal] = useServerState(events);
  const [, startTransition] = useTransition();

  // Shared by every card, so the whole page recomputes once per day rather
  // than once per card per render.
  const today = useToday();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ordered = [...local].sort((a, b) => a.position - b.position);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const ids = ordered.map((c) => c.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    const next = arrayMove(ids, from, to);
    setLocal((prev) => prev.map((c) => ({ ...c, position: next.indexOf(c.id) })));
    startTransition(() => reorderEvents(next));
  }

  return (
    <div className="flex flex-col gap-4">
      <AddEventForm />

      {ordered.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">
          No events yet. Add one above, or tick “add to visualisation” on a
          task.
        </p>
      ) : (
        <DndContext
          // See the note in tasks-board.tsx: a stable id keeps dnd-kit's
          // generated aria ids identical across server and client renders.
          id="event-board"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ordered.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {ordered.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  today={today}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
