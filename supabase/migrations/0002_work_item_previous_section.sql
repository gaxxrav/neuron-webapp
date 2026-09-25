-- Remembers where an item lived before it was promoted to the priority
-- section, so un-prioritising can send it back rather than dumping it in a
-- fixed list. Null means "no record" — the app falls back to the default list.
--
-- `on delete set null`: if that section is later deleted, the reference clears
-- itself and the fallback takes over.

alter table public.work_items
  add column if not exists previous_section_id uuid
    references public.sections (id) on delete set null;
