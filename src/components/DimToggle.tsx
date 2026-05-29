"use client";

import { useEffect, useState } from "react";

// Floating low-light ("party") toggle. Drops a soft veil over the whole page
// for dim-room settings, persisted per device. Lives globally in the layout.
export default function DimToggle() {
  const [dim, setDim] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dimMode") === "on";
    setDim(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.dim = dim ? "on" : "off";
    try {
      localStorage.setItem("dimMode", dim ? "on" : "off");
    } catch {
      // ignore private-mode storage errors
    }
  }, [dim, ready]);

  return (
    <button
      type="button"
      onClick={() => setDim((v) => !v)}
      aria-label={dim ? "回復正常亮度" : "低光模式"}
      aria-pressed={dim}
      title={dim ? "回復正常亮度" : "低光模式"}
      className="fixed right-3 z-[70] flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/70 text-sm backdrop-blur transition hover:border-accent/40"
      style={{ top: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      {dim ? "🌙" : "🔆"}
    </button>
  );
}
