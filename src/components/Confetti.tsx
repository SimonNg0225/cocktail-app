"use client";

import { useEffect, useState } from "react";

const COLORS = ["#e0ad53", "#f4d699", "#c8893a", "#7fd1a0", "#f7efe2"];

type Piece = {
  left: number;
  dx: number;
  rot: number;
  dur: number;
  delay: number;
  color: string;
  w: number;
  h: number;
};

// Built lazily inside an effect (never during render) so the randomness
// stays out of React's pure render path.
function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, () => ({
    left: Math.random() * 100,
    dx: (Math.random() - 0.5) * 170,
    rot: 360 + Math.random() * 600,
    dur: 2.2 + Math.random() * 1.4,
    delay: Math.random() * 0.5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    w: 7 + Math.random() * 5,
    h: 10 + Math.random() * 8,
  }));
}

// Lightweight DOM confetti — no canvas, no deps. Fires a burst whenever
// `show` flips truthy, then auto-clears once the pieces have fallen.
export default function Confetti({
  show,
  count = 46,
}: {
  show: boolean;
  count?: number;
}) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!show) return;
    const raf = requestAnimationFrame(() => setPieces(makePieces(count)));
    const t = setTimeout(() => setPieces([]), 3400);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [show, count]);

  if (pieces.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
      aria-hidden
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              width: p.w,
              height: p.h,
              background: p.color,
              animationDelay: `${p.delay}s`,
              ["--dx" as string]: `${p.dx}px`,
              ["--rot" as string]: `${p.rot}deg`,
              ["--dur" as string]: `${p.dur}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
