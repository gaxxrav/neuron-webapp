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

import { AddCountdownForm } from "@/components/countdown/add-countdown-form";
import { CountdownCard } from "@/components/countdown/countdown-card";
import { reorderCountdowns } from "@/lib/actions";
import type { Countdown } from "@/lib/types";
import { useServerState } from "@/lib/use-server-state";
import { useToday } from "@/lib/use-today";

export function CountdownBoard({ countdowns }: { countdowns: Countdown[] }) {
  const [local, setLocal] = useServerState(countdowns);
  const [, startTransition] = useTransition();

  // Shared by every card, so the whole page recomputes once per day rather
  // than once per card per render.
  const today = useToday();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ordered = [...local].sort((a, b) => a.position - b.position);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = ordered.map((c) => c.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    const next = arrayMove(ids, from, to);
    setLocal((prev) => prev.map((c) => ({ ...c, position: next.indexOf(c.id) })));
    startTransition(() => reorderCountdowns(next));
  }

  return (
    <div className="flex flex-col gap-4">
      <AddCountdownForm />

      {ordered.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">
          No countdowns yet. Add one above, or tick “add to visualisation” on a
          work item.
        </p>
      ) : (
        <DndContext
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
              {ordered.map((countdown) => (
                <CountdownCard
                  key={countdown.id}
                  countdown={countdown}
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
