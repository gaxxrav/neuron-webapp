"use client";

import { createContext, useContext } from "react";

/**
 * Item mutations, owned by the board so they can update its local state
 * before the server responds. Rows call these instead of server actions
 * directly: a row cannot move itself between sections or remove itself from
 * the list, and every one of these needs to be visible instantly.
 *
 * Each handler applies the change locally, fires the action, and rolls the
 * local change back if it fails.
 */
export type BoardActions = {
  toggleDone: (id: string, done: boolean) => void;
  rename: (id: string, title: string) => void;
  remove: (id: string) => void;
  togglePriority: (id: string) => void;
  setVisualised: (id: string, on: boolean, endDate?: string) => void;
};

const BoardContext = createContext<BoardActions | null>(null);

export const BoardProvider = BoardContext.Provider;

export function useBoardActions(): BoardActions {
  const actions = useContext(BoardContext);
  if (!actions) {
    throw new Error("useBoardActions must be used inside the tasks board.");
  }
  return actions;
}
