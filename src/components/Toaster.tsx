"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, type Toast } from "@/lib/toast";

// Renders the global toast stack. Sits above the bottom nav / cart bar.
export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[65] flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="glass animate-pop pointer-events-auto max-w-xs rounded-full px-4 py-2 text-sm font-medium shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
