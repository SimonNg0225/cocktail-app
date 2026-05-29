"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// App-style bottom tab bar for guest pages. Hidden on host (/admin) and on the
// order-status screen so it never competes with their own bottom actions.
const TABS = [
  { href: "/", label: "酒單", icon: "🍸" },
  { href: "/orders", label: "我的單", icon: "🧾" },
  { href: "/stars", label: "之星", icon: "🏆" },
];

export default function BottomNav() {
  const pathname = usePathname();
  // Only the three guest browse pages get the tab bar.
  const show = TABS.some((t) => t.href === pathname);
  if (!show) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border-soft bg-surface/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="主導覽"
    >
      <div className="mx-auto flex w-full max-w-2xl">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[0.7rem] transition-colors ${
                active ? "text-accent" : "text-muted-2 hover:text-foreground"
              }`}
            >
              <span className={`text-lg ${active ? "animate-pop" : ""}`}>
                {t.icon}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
