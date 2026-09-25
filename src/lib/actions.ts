"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Countdown, Section, WorkItem } from "@/lib/types";

const PRIORITY_SECTION_NAME = "Priority";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, userId: user.id };
}

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/countdown");
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
  items: WorkItem[];
  /** Work item ids that currently have a linked countdown. */
  visualisedItemIds: string[];
};

export async function loadWorkspace(): Promise<Workspace> {
  const { supabase, userId } = await requireUser();

  // The priority section is created lazily on first load so a brand new
  // account always has somewhere to put priority items.
  await ensurePrioritySection();

  const [sectionsRes, itemsRes, countdownsRes] = await Promise.all([
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
  if (countdownsRes.error) throw countdownsRes.error;

  return {
    sections: sectionsRes.data as Section[],
    items: itemsRes.data as WorkItem[],
    visualisedItemIds: (countdownsRes.data ?? [])
      .map((r) => r.work_item_id as string)
      .filter(Boolean),
  };
}

export async function loadCountdowns(): Promise<Countdown[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("countdowns")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });
  if (error) throw error;
  return data as Countdown[];
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
  refresh();
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
  refresh();
}

/** Deletes a normal section and, by cascade, the work items inside it. */
export async function deleteSection(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("sections")
    .delete()
    .eq("id", id)
    .eq("kind", "normal"); // The priority section is not deletable.
  if (error) throw error;
  refresh();
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
  refresh();
}

// ---------------------------------------------------------------------------
// Work items
// ---------------------------------------------------------------------------

export type CreateWorkItemInput = {
  title: string;
  /** Ignored when `priority` is set: priority items always go to that section. */
  sectionId: string;
  priority: boolean;
  addToVisualisation: boolean;
  /** Required when `addToVisualisation` is set. */
  endDate?: string;
  startDate?: string;
};

export async function createWorkItem(input: CreateWorkItemInput): Promise<void> {
  const { supabase, userId } = await requireUser();
  const title = input.title.trim();
  if (!title) return;

  const sectionId = input.priority
    ? await ensurePrioritySection()
    : input.sectionId;
  if (!sectionId) throw new Error("Pick a section for this item.");

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
    await linkCountdown(item.id as string, title, input.endDate, input.startDate);
  }

  refresh();
}

export async function setWorkItemDone(id: string, done: boolean): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("work_items").update({ done }).eq("id", id);
  if (error) throw error;
  refresh();
}

export async function renameWorkItem(id: string, title: string): Promise<void> {
  const { supabase } = await requireUser();
  const trimmed = title.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("work_items")
    .update({ title: trimmed.slice(0, 500) })
    .eq("id", id);
  if (error) throw error;
  refresh();
}

export async function deleteWorkItem(id: string): Promise<void> {
  const { supabase } = await requireUser();
  // The linked countdown, if any, goes with it via on delete cascade.
  const { error } = await supabase.from("work_items").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

/**
 * Persists a drag: `orderedIds` are the items of `sectionId` in their new
 * order, including any item that was just dragged in from another section.
 */
export async function reorderWorkItems(
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
  refresh();
}

// ---------------------------------------------------------------------------
// Countdowns
// ---------------------------------------------------------------------------

async function linkCountdown(
  workItemId: string,
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
    work_item_id: workItemId,
    title: title.slice(0, 500),
    // Omitted rather than nulled so the column default (today) applies.
    ...(startDate ? { start_date: startDate } : {}),
    end_date: endDate,
    position: nextPosition(siblings ?? []),
  });
  if (error) throw error;
}

/**
 * The "add to visualisation" checkbox on an existing work item. Turning it off
 * removes the countdown entirely — an unchecked item does not appear on the
 * visualisation tab at all.
 */
export async function setWorkItemVisualised(
  workItemId: string,
  visualised: boolean,
  endDate?: string,
  startDate?: string,
): Promise<void> {
  const { supabase } = await requireUser();

  if (!visualised) {
    const { error } = await supabase
      .from("countdowns")
      .delete()
      .eq("work_item_id", workItemId);
    if (error) throw error;
    refresh();
    return;
  }

  if (!endDate) throw new Error("Pick an end date first.");

  const { data: item, error: itemError } = await supabase
    .from("work_items")
    .select("title")
    .eq("id", workItemId)
    .single();
  if (itemError) throw itemError;

  await linkCountdown(workItemId, item.title as string, endDate, startDate);
  refresh();
}

export type CreateCountdownInput = {
  title: string;
  endDate: string;
  startDate?: string;
};

/** A countdown that exists only on the visualisation tab, with no work item. */
export async function createCountdown(
  input: CreateCountdownInput,
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
  refresh();
}

export async function updateCountdown(
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
  refresh();
}

/**
 * Removes the countdown only. A linked work item stays on the tasks tab — this
 * is the same as unticking "add to visualisation".
 */
export async function deleteCountdown(id: string): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("countdowns").delete().eq("id", id);
  if (error) throw error;
  refresh();
}

export async function setCountdownCollapsed(
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

export async function reorderCountdowns(orderedIds: string[]): Promise<void> {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("countdowns").update({ position: index }).eq("id", id),
    ),
  );
  refresh();
}
