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
