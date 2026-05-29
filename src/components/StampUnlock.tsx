"use client";

import { useEffect } from "react";
import Link from "next/link";

// Celebratory "stamp press" moment shown when a served order unlocks new 圖鑑
// stamps. Each seal slams down with a recoil + gold ink ripple, staggered.
const GLASSES = ["🍸", "🍹", "🥃", "🍷", "🧉"];
function glassFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return GLASSES[h % GLASSES.length];
}

export default function StampUnlock({
  drinks,
  onClose,
}: {
  drinks: { id: string; name: string }[];
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="解鎖新印章"
    >
      <div
        className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm text-center">
        <p className="animate-fade-up text-xs uppercase tracking-[0.4em] text-accent">
          圖鑑解鎖
        </p>
        <h2 className="animate-fade-up mt-2 font-display text-3xl font-semibold text-gradient-gold-anim">
          蓋章！🎉
        </h2>
        <p className="animate-fade-up mt-1 text-sm text-muted">
          你收集咗 {drinks.length} 個新印章
        </p>

        <div className="mt-8 flex flex-wrap items-start justify-center gap-6">
          {drinks.map((d, i) => {
            const press = i * 0.5; // stagger each seal
            return (
              <div
                key={d.id}
                className="flex w-28 flex-col items-center gap-2"
              >
                <div className="relative h-28 w-28">
                  {/* ink ripple — fires at the moment of impact */}
                  <span
                    className="animate-ink-ripple absolute inset-0 rounded-full border-2 border-accent"
                    style={{ animationDelay: `${press + 0.3}s` }}
                    aria-hidden
                  />
                  {/* the seal */}
                  <div
                    className="animate-stamp-press relative flex h-28 w-28 items-center justify-center rounded-full text-5xl"
                    style={{
                      animationDelay: `${press}s`,
                      background:
                        "radial-gradient(circle at 35% 30%, #f0c673, #c8893a 70%, #a86f2a 100%)",
                      boxShadow:
                        "inset 0 2px 6px rgba(255,255,255,0.5), inset 0 -6px 14px rgba(0,0,0,0.35), 0 10px 24px -10px rgba(224,173,83,0.7)",
                    }}
                  >
                    <span
                      className="absolute inset-2 rounded-full border-2 border-dashed"
                      style={{ borderColor: "rgba(26,18,6,0.35)" }}
                    />
                    <span className="drop-shadow">{glassFor(d.name)}</span>
                  </div>
                </div>
                <p className="line-clamp-2 text-center text-sm font-medium">
                  {d.name}
                </p>
              </div>
            );
          })}
        </div>

        <div className="animate-fade-up mt-9 flex justify-center gap-3">
          <Link
            href="/collection"
            className="btn-gold rounded-full px-5 py-2.5 text-sm"
          >
            睇我嘅圖鑑 →
          </Link>
          <button
            onClick={onClose}
            className="btn-ghost rounded-full px-5 py-2.5 text-sm"
          >
            繼續
          </button>
        </div>
      </div>
    </div>
  );
}
