"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "收單" },
  { href: "/admin/menu", label: "酒單" },
  { href: "/admin/inventory", label: "庫存" },
  { href: "/admin/recipes", label: "AI 配方" },
  { href: "/admin/qr", label: "QR" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1.5 overflow-x-auto rounded-full border border-border-soft bg-surface/60 p-1 backdrop-blur">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              active
                ? "btn-gold"
                : "text-muted hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
