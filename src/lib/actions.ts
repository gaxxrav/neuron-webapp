"use server";

import { revalidatePath } from "next/cache";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { EventItem, Section, Task } from "@/lib/types";

const PRIORITY_SECTION_NAME = "Priority";
const DEFAULT_SECTION_NAME = "To do";

/**
 * The signed-in user and a Supabase client, resolved once per request.
 *
 * `auth.getUser()` re-validates the JWT against Supabase's auth server on
 * every call — it never reads from cache — so an action that called this
 * three times paid three network round trips. React's `cache` memoises for
 * the lifetime of one request, so the many call sites below now share a
 * single validation.
 */
const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, userId: user.id };
});

/**
 * Revalidating both tabs on every write meant ticking a task refetched the
 * event data too. Each action now names the routes its change is visible
 * on. "all" is for writes that cascade across both, such as deleting an item
 * that owns an event.
 */
function refresh(scope: "tasks" | "events" | "all") {
  if (scope !== "events") revalidatePath("/tasks");
  if (scope !== "tasks") revalidatePath("/events");
}

/** Position one past the current maximum, so new rows land at the bottom. */
function nextPosition(rows: { position: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.position), -1) + 1;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

export type Workspace = {
  sections: Section[];
  items: Task[];
  /** Task ids that currently have a linked event. */
  visualisedItemIds: string[];
};

export async function loadWorkspace(): Promise<Workspace> {
  const { supabase, userId } = await requireUser();

  // Both are created lazily on first load: the priority section, and an
  // ordinary list for everything else. Without the latter a new account has
  // nowhere to put an unticked item, which would force every item to be a
  // priority.
  await ensurePrioritySection();
  await ensureDefaultSection();

  const [sectionsRes, itemsRes, eventsRes] = await Promise.all([
    supabase
      .from("sections")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("work_items")
      .select("*")
      .eq("user_id", userId)
      .order("position", { ascending: true }),
    supabase
      .from("countdowns")
      .select("work_item_id")
      .eq("user_id", userId)
      .not("work_item_id", "is", null),
  ]);

  if (sectionsRes.error) throw sectionsRes.error;
  if (itemsRes.error) throw itemsRes.error;
  if (eventsRes.error) throw eventsRes.error;

  return {
    sections: sectionsRes.data as Section[],
    items: itemsRes.data as Task[],
    visualisedItemIds: (eventsRes.data ?? [])
      .map((r) => r.work_item_id as string)
      .filter(Boolean),
  };
}

export async function loadEvents(): Promise<EventItem[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("countdowns")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data as EventItem[];
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export async function ensurePrioritySection(): Promise<string> {
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("sections")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "priority")
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("sections")
    .insert({
      user_id: userId,
      name: PRIORITY_SECTION_NAME,
      kind: "priority",
      position: -1, // Sorts above every normal section as a safety net.
    })
    .select("id")
    .single();

  // A concurrent first load can win the race against the unique index; in that
  // case just read back the winner.
  if (error) {
    const { data: raced } = await supabase
      .from("sections")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "priority")
      .single();
    if (raced) return raced.id as string;
    throw error;
  }

  return data.id as string;
}

/**
 * The landing place for items that are not marked as priority. Recreated if
 * every ordinary section has been deleted, so there is always a plain list.
 */
export async function ensureDefaultSection(): Promise<string> {
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("sections")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "normal")
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("sections")
    .insert({
      user_id: userId,
      name: DEFAULT_SECTION_NAME,
      kind: "normal",
      position: 0,
    })
    .select("id")
    .single();
  if (error) throw error;

  return data.id as string;
}

export async function createSection(name: string): Promise<void> {
  const { supabase, userId } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return;

  const { data: siblings } = await supabase
    .from("sections")
    .select("position")
    .eq("user_id", userId)
    .eq("kind", "normal");

  const { error } = await supabase.from("sections").insert({
    user_id: userId,
    name: trimmed.slice(0, 80),
    kind: "normal",
    position: nextPosition(siblings ?? []),
  });
  if (error) throw error;
  refresh("tasks");
}

export async function renameSection(id: string, name: string): Promise<void> {
  const { supabase } = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("sections")
    .update({ name: trimmed.slice(0, 80) })
    .eq("id", id);
  if (error) throw error;
  refresh("tasks");
}

/** Deletes a normal section and, by cascade, the tasks inside it. */
export async function deleteSection(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("sections")
    .delete()
    .eq("id", id)
    .eq("kind", "normal"); // The priority section is not deletable.
  if (error) throw error;
  refresh("all");
}

export async function setSectionCollapsed(
  id: string,
  collapsed: boolean,
): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("sections")
    .update({ collapsed })
    .eq("id", id);
  if (error) throw error;
}

/** `orderedIds` must contain only normal sections, already in display order. */
export async function reorderSections(orderedIds: string[]): Promise<void> {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("sections")
        .update({ position: index })
        .eq("id", id)
        .eq("kind", "normal"),
    ),
  );
  refresh("tasks");
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export type CreateTaskInput = {
  title: string;
  /** Ignored when `priority` is set; falls back to the default list if empty. */
  sectionId: string;
  priority: boolean;
  addToVisualisation: boolean;
  /** Required when `addToVisualisation` is set. */
  endDate?: string;
  startDate?: string;
};

export async function createTask(input: CreateTaskInput): Promise<void> {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim();
  if (!title) return;

  // Priority is opt-in: an unticked item goes to its chosen section, or to
  // the default list when none was chosen.
  const sectionId = input.priority
    ? await ensurePrioritySection()
    : (input.sectionId || (await ensureDefaultSection()));
  if (!sectionId) throw new Error("Could not find a section for this item.");

  const { data: siblings } = await supabase
    .from("work_items")
    .select("position")
    .eq("section_id", sectionId);

  const { data: item, error } = await supabase
    .from("work_items")
    .insert({
      user_id: userId,
      section_id: sectionId,
      title: title.slice(0, 500),
      position: nextPosition(siblings ?? []),
    })
    .select("*")
    .single();
  if (error) throw error;

  if (input.addToVisualisation) {
    if (!input.endDate) {
      throw new Error("Pick an end date to add this item to the visualisation.");
    }
    await linkEvent(item.id as string, title, input.endDate, input.startDate);
  }

  refresh(input.addToVisualisation ? "all" : "tasks");
}

/**
 * Moves an item into or out of the priority section without dragging.
 *
 * Promoting records the section it came from; demoting sends it back there,
 * falling back to the default list when that section is gone (the column is
 * `on delete set null`) or was never recorded. The item lands at the bottom
 * of wherever it arrives.
 */
export async function setTaskPriority(
  id: string,
  priority: boolean,
): Promise<void> {
  const { supabase } = await requireUser();

  const { data: item, error: readError } = await supabase
    .from("work_items")
    .select("section_id, previous_section_id")
    .eq("id", id)
    .single();
  if (readError) throw readError;

  const prioritySectionId = await ensurePrioritySection();
  const isPriority = item.section_id === prioritySectionId;
  if (priority === isPriority) return;

  let target: string;
  let previous: string | null;

  if (priority) {
    target = prioritySectionId;
    previous = item.section_id as string;
  } else {
    const remembered = item.previous_section_id as string | null;
    // Guard against a stale self-reference sending it straight back.
    target =
      remembered && remembered !== prioritySectionId
        ? remembered
        : await ensureDefaultSection();
    previous = null;
  }

  const { data: siblings } = await supabase
    .from("work_items")
    .select("position")
    .eq("section_id", target);

  const { error } = await supabase
    .from("work_items")
    .update({
      section_id: target,
      previous_section_id: previous,
      position: nextPosition(siblings ?? []),
    })
    .eq("id", id);
  if (error) throw error;

  refresh("tasks");
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("work_items").update({ done }).eq("id", id);
  if (error) throw error;
  refresh("tasks");
}

export async function renameTask(id: string, title: string): Promise<void> {
  const { supabase } = await requireUser();
  const trimmed = title.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("work_items")
    .update({ title: trimmed.slice(0, 500) })
    .eq("id", id);
  if (error) throw error;
  refresh("tasks");
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase } = await requireUser();

  // Any linked event is removed explicitly first. The foreign key is
  // declared `on delete cascade`, so this is belt and braces — but it keeps
  // the delete working even where that constraint is missing, and it makes
  // the intent visible at the call site rather than hidden in the schema.
  const { error: eventError } = await supabase
    .from("countdowns")
    .delete()
    .eq("work_item_id", id);
  if (eventError) throw eventError;

  const { error } = await supabase.from("work_items").delete().eq("id", id);
  if (error) throw error;

  refresh("all");
}

/**
 * Persists a drag: `orderedIds` are the items of `sectionId` in their new
 * order, including any item that was just dragged in from another section.
 */
export async function reorderTasks(
  sectionId: string,
  orderedIds: string[],
): Promise<void> {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("work_items")
        .update({ section_id: sectionId, position: index })
        .eq("id", id),
    ),
  );
  refresh("tasks");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

async function linkEvent(
  taskId: string,
  title: string,
  endDate: string,
  startDate?: string,
): Promise<void> {
  const { supabase, userId } = await requireUser();

  const { data: siblings } = await supabase
    .from("countdowns")
    .select("position")
    .eq("user_id", userId);

  const { error } = await supabase.from("countdowns").insert({
    user_id: userId,
    work_item_id: taskId,
    title: title.slice(0, 500),
    // Omitted rather than nulled so the column default (today) applies.
    ...(startDate ? { start_date: startDate } : {}),
    end_date: endDate,
    position: nextPosition(siblings ?? []),
  });
  if (error) throw error;
}

/**
 * The "add to visualisation" checkbox on an existing task. Turning it off
 * removes the event entirely — an unchecked item does not appear on the
 * visualisation tab at all.
 */
export async function setTaskVisualised(
  taskId: string,
  visualised: boolean,
  endDate?: string,
  startDate?: string,
): Promise<void> {
  const { supabase } = await requireUser();

  if (!visualised) {
    const { error } = await supabase
      .from("countdowns")
      .delete()
      .eq("work_item_id", taskId);
    if (error) throw error;
    refresh("all");
    return;
  }

  if (!endDate) throw new Error("Pick an end date first.");

  const { data: item, error: itemError } = await supabase
    .from("work_items")
    .select("title")
    .eq("id", taskId)
    .single();
  if (itemError) throw itemError;

  await linkEvent(taskId, item.title as string, endDate, startDate);
  refresh("all");
}

export type CreateEventInput = {
  title: string;
  endDate: string;
  startDate?: string;
};

/** An event that exists only on the visualisation tab, with no task. */
export async function createEvent(
  input: CreateEventInput,
): Promise<void> {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim();
  if (!title || !input.endDate) return;

  const { data: siblings } = await supabase
    .from("countdowns")
    .select("position")
    .eq("user_id", userId);

  const { error } = await supabase.from("countdowns").insert({
    user_id: userId,
    work_item_id: null,
    title: title.slice(0, 500),
    ...(input.startDate ? { start_date: input.startDate } : {}),
    end_date: input.endDate,
    position: nextPosition(siblings ?? []),
  });
  if (error) throw error;
  refresh("events");
}

export async function updateEvent(
  id: string,
  patch: { title?: string; startDate?: string; endDate?: string },
): Promise<void> {
  const { supabase } = await requireUser();
  const update: Record<string, string> = {};
  if (patch.title?.trim()) update.title = patch.title.trim().slice(0, 500);
  if (patch.startDate) update.start_date = patch.startDate;
  if (patch.endDate) update.end_date = patch.endDate;
  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from("countdowns").update(update).eq("id", id);
  if (error) throw error;
  refresh("events");
}

/**
 * Removes the event only. A linked task stays on the tasks tab — this
 * is the same as unticking "add to visualisation".
 */
export async function deleteEvent(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("countdowns").delete().eq("id", id);
  if (error) throw error;
  refresh("all");
}

export async function setEventCollapsed(
  id: string,
  collapsed: boolean,
): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("countdowns")
    .update({ collapsed })
    .eq("id", id);
  if (error) throw error;
}

export async function reorderEvents(orderedIds: string[]): Promise<void> {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("countdowns").update({ position: index }).eq("id", id),
    ),
  );
  refresh("events");
}
