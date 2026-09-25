-- Neuron webapp: initial schema
-- Tables: sections, work_items, countdowns. All rows are scoped to a user and
-- protected by RLS so a signed-in user only ever sees their own data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sections
-- ---------------------------------------------------------------------------
-- `kind` distinguishes the single pinned priority section from the ordinary
-- ones. The priority section is never reordered, so its position is ignored.
create table if not exists public.sections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 80),
  kind        text not null default 'normal' check (kind in ('priority', 'normal')),
  position    integer not null default 0,
  collapsed   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- At most one priority section per user.
create unique index if not exists sections_one_priority_per_user
  on public.sections (user_id)
  where kind = 'priority';

create index if not exists sections_user_position_idx
  on public.sections (user_id, position);

-- ---------------------------------------------------------------------------
-- work_items
-- ---------------------------------------------------------------------------
create table if not exists public.work_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  section_id  uuid not null references public.sections (id) on delete cascade,
  title       text not null check (char_length(trim(title)) between 1 and 500),
  notes       text,
  done        boolean not null default false,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists work_items_section_position_idx
  on public.work_items (section_id, position);

-- ---------------------------------------------------------------------------
-- countdowns
-- ---------------------------------------------------------------------------
-- A countdown is independent of the task list: it may be linked to a work item
-- (created via the "add to visualisation" checkbox) or stand entirely alone.
-- Deleting a linked work item removes the countdown with it.
create table if not exists public.countdowns (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  work_item_id  uuid references public.work_items (id) on delete cascade,
  title         text not null check (char_length(trim(title)) between 1 and 500),
  start_date    date not null default current_date,
  end_date      date not null,
  position      integer not null default 0,
  collapsed     boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint countdowns_end_after_start check (end_date >= start_date)
);

-- A work item maps to at most one countdown, so toggling the checkbox is
-- idempotent rather than piling up duplicates.
create unique index if not exists countdowns_one_per_work_item
  on public.countdowns (work_item_id)
  where work_item_id is not null;

create index if not exists countdowns_user_position_idx
  on public.countdowns (user_id, position);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.sections   enable row level security;
alter table public.work_items enable row level security;
alter table public.countdowns enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['sections', 'work_items', 'countdowns'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_delete', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (auth.uid() = user_id)',
      t || '_owner_select', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (auth.uid() = user_id)',
      t || '_owner_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_owner_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (auth.uid() = user_id)',
      t || '_owner_delete', t);
  end loop;
end
$$;
