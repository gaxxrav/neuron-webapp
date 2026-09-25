"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

/**
 * Local state seeded from a server prop, so drags and toggles apply instantly,
 * that resets whenever the server sends a fresh value (after `revalidatePath`).
 *
 * This is React's "adjust state during render" pattern rather than a
 * prop-syncing effect: it re-renders before committing, with no cascading
 * render or flash of stale data.
 */
export function useServerState<T>(
  serverValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(serverValue);
  const [seen, setSeen] = useState(serverValue);

  if (seen !== serverValue) {
    setSeen(serverValue);
    setValue(serverValue);
  }

  return [value, setValue];
}
