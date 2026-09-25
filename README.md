# Neuron

A personal work-item tracker with a day-by-day countdown visualiser.

**Work items** live in collapsible, drag-reorderable sections. A red **Priority**
section is pinned at the top and cannot be moved or deleted. Ticking
*add to visualisation* on an item creates a linked countdown on the second tab.

**Countdowns** render one box per day of a span, filling in each day that has
completed. The list is independent of the task list — a countdown can stand
alone, or be linked to a work item.

Next.js 16 (App Router) · Supabase (Postgres + Auth) · Tailwind v4 · dnd-kit.

---

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and run it.
   This creates the three tables and the row-level-security policies that scope
   every row to its owner.

### 2. Enable Google sign-in

1. In Google Cloud Console → **APIs & Services → Credentials**, create an
   **OAuth 2.0 Client ID** of type *Web application*.
2. Add this authorised redirect URI, using your project ref:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. In Supabase → **Authentication → Providers → Google**, enable it and paste
   the client ID and secret.
4. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your
   production URL and add these to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - `https://<your-app>.vercel.app/auth/callback`

### 3. Run it locally

```bash
cp .env.example .env.local   # then fill in the two values
npm install
npm run dev
```

Both env values come from Supabase → **Project Settings → API**. They are safe in
the browser: the anon key only grants what row-level security allows. **Never** add
the `service_role` key — this repository is public.

### 4. Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
   environment variables for all environments.
3. Deploy, then add the resulting URL to the Supabase redirect list in step 2.4.

---

## How the pieces fit

| Path | Role |
| --- | --- |
| `supabase/migrations/` | Schema and RLS policies |
| `src/proxy.ts` | Refreshes the session cookie, redirects signed-out visitors |
| `src/lib/actions.ts` | Every read and write, as server actions |
| `src/lib/dates.ts` | Calendar-day maths for countdowns |
| `src/lib/use-today.ts` | Re-renders countdowns only when the local day rolls over |
| `src/components/tasks/` | Sections, items, drag and drop |
| `src/components/countdown/` | Countdown cards and the day-box grid |

### Countdown refresh behaviour

Progress is derived from calendar dates, never from timestamps, so it changes
only when the local date does. `useToday` arms a single timer for the next local
midnight instead of polling, and re-checks when the tab regains focus (a laptop
asleep past midnight never fires its timer on time). Nothing recalculates on an
ordinary render or page load within the same day.

### Ordering

`sections`, `work_items` and `countdowns` each carry an integer `position`.
A drag renumbers the affected list and persists it. The priority section is
excluded from section reordering and sits at `position = -1` as a safety net.
