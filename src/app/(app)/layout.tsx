import type { ReactNode } from "react";

import { SwipeTabs } from "@/components/swipe-tabs";
import { TabNav } from "@/components/tab-nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">Neuron</span>
          <div className="flex-1">
            <TabNav />
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title={user?.email ?? undefined}
              className="rounded-lg px-2 py-1.5 text-xs text-muted transition hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <SwipeTabs>{children}</SwipeTabs>
      </main>
    </div>
  );
}
