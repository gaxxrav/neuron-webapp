"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/tasks", label: "Tasks" },
  { href: "/events", label: "Events" },
] as const;

export function TabNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1" aria-label="Sections">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            // Both pages are force-dynamic, and dynamic segments are not kept
            // in the client cache by default (staleTimes.dynamic is 0). An
            // explicit prefetch pulls the whole payload up front and reuses it
            // for the static window, so switching does not re-render on the
            // server every time. Server actions still invalidate it on write.
            prefetch
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
