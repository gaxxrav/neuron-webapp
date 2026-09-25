# Neuron

A personal work-item tracker with a day-by-day event visualiser.

**Tasks** live in collapsible, drag-reorderable sections. A red **Priority**
section is pinned at the top and cannot be moved or deleted. Ticking
*add to visualisation* on an item creates a linked event on the second tab.

**Events** render one box per day of a span, filling in each day that has
completed. The list is independent of the task list — a event can stand
alone, or be linked to a task.

Next.js 16 (App Router) · Supabase (Postgres + Auth) · Tailwind v4 · dnd-kit.

---

## Setup

### 1. Create the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** and run each file in
   [`supabase/migrations/`](supabase/migrations) in filename order:
   - `0001_init.sql` — the three tables, plus the row-level-security policies
     that scope every row to its owner.
   - `0002_work_item_previous_section.sql` — remembers where an item was before
     it was promoted to priority, so un-prioritising sends it back.

   Every migration is safe to re-run.

### 2. Configure email + password sign-in

In the Supabase dashboard:

1. **Authentication → Sign In / Providers → Email** — make sure **Enable email
   provider** is on (it is by default).
2. Turn **Confirm email** *off*. Supabase's built-in mailer allows only a
   couple of messages an hour and is not meant for production, so with
   confirmation off the app sends no email at all and you can sign in
   immediately after creating the account.
3. **Authentication → URL Configuration** — set **Site URL** to
   `http://localhost:3000`, and add `http://localhost:3000/**` under
   **Redirect URLs**. Add your Vercel URL to both after deploying.

There is no public sign-up page beyond the one form: create your account once,
then consider switching **Allow new users to sign up** off under
**Authentication → Sign In / Providers** so nobody else can register.

### 3. Run it locally

```bash
cp .env.example .env.local   # then fill in the two values
npm install
npm run dev
```

Both env values come from Supabase → **Project Settings → API Keys**: the project
URL, and the **anon public** key (newer projects label this the *publishable*
key — either works). They are safe in the browser; the anon key only grants what
row-level security allows. **Never** add the `service_role` or any `sb_secret_`
key — this repository is public.

On first run, open http://localhost:3000, choose **Create an account**, and sign in.

### 4. Deploy to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as
   environment variables for all environments.
3. Deploy, then add the resulting URL to **Site URL** and **Redirect URLs** in
   Supabase (step 2.3).

---

## How the pieces fit

| Path | Role |
| --- | --- |
| `supabase/migrations/` | Schema and RLS policies. Tables are still named `work_items` and `countdowns`; the UI calls them tasks and events |
| `src/proxy.ts` | Refreshes the session cookie, redirects signed-out visitors |
| `src/app/login/actions.ts` | Sign-in and sign-up, as server actions |
| `src/app/auth/callback/` | Code exchange, used only if you re-enable email confirmation or add password reset |
| `src/lib/actions.ts` | Every read and write, as server actions |
| `src/lib/dates.ts` | Calendar-day maths for events |
| `src/lib/use-today.ts` | Re-renders events only when the local day rolls over |
| `src/components/tasks/` | Sections, items, drag and drop |
| `src/components/event/` | Event cards and the day-box grid |

### Event refresh behaviour

Progress is derived from calendar dates, never from timestamps, so it changes
only when the local date does. `useToday` arms a single timer for the next local
midnight instead of polling, and re-checks when the tab regains focus (a laptop
asleep past midnight never fires its timer on time). Nothing recalculates on an
ordinary render or page load within the same day.

### Ordering

`sections`, `work_items` and `events` each carry an integer `position`.
A drag renumbers the affected list and persists it. The priority section is
excluded from section reordering and sits at `position = -1` as a safety net.
