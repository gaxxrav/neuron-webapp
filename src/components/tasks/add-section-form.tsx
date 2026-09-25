"use client";

import { useState, useTransition } from "react";

import { PlusIcon } from "@/components/icons";
import { createSection } from "@/lib/actions";

export function AddSectionForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createSection(trimmed);
      setName("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <PlusIcon className="size-4" />
        Add section
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setName("");
            setOpen(false);
          }
        }}
        placeholder="Section name"
        aria-label="New section name"
        maxLength={80}
        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
      />
      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {pending ? "Adding…" : "Create"}
      </button>
      <button
        type="button"
        onClick={() => {
          setName("");
          setOpen(false);
        }}
        className="rounded-lg px-3 py-2 text-sm text-muted transition hover:text-foreground"
      >
        Cancel
      </button>
    </form>
  );
}
