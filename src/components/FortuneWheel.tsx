"use client";

import { useEffect, useRef, useState } from "react";
import type { Drink } from "@/lib/types";
import { haptic } from "@/lib/haptics";

// A golden prize wheel for picking a drink — spins with ticking clicks, eases to
// a stop, then reveals the winner. Far more of a moment than a silent random.
export default function FortuneWheel({
  pool,
  onPick,
  onClose,
}: {
  pool: Drink[];
  onPick: (d: Drink) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<Drink[]>([]);
  const n = items.length;
  const seg = n > 0 ? 360 / n : 360;
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const DURATION = 4.2;

  // Capture a shuffled subset once on open (kept stable through re-renders/spin).
  useEffect(() => {
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(arr.slice(0, Math.min(arr.length, 10)));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function click() {
    let ctx = audioRef.current;
    if (!ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      audioRef.current = ctx;
    }
    ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 1500;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  function ticks() {
    let elapsed = 0;
    let gap = 55;
    const step = () => {
      if (elapsed >= DURATION * 1000) return;
      click();
      if ("vibrate" in navigator) navigator.vibrate(6);
      elapsed += gap;
      gap *= 1.11; // clicks slow down as the wheel decelerates
      window.setTimeout(step, gap);
    };
    step();
  }

  function spin() {
    if (spinning || n === 0) return;
    setSpinning(true);
    setWinner(null);
    const idx = Math.floor(Math.random() * n);
    // land segment idx under the top pointer
    const desired = (360 - (idx * seg + seg / 2) + 360) % 360;
    const current = ((rot % 360) + 360) % 360;
    const delta = (5 + Math.floor(Math.random() * 3)) * 360 + ((desired - current + 360) % 360);
    setRot((r) => r + delta);
    ticks();
    window.setTimeout(() => {
      setWinner(idx);
      setSpinning(false);
      haptic("success");
    }, DURATION * 1000 + 100);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="命運輪盤"
    >
      <div
        className="animate-fade-in absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-sm text-center">
        <h2 className="animate-fade-up font-display text-2xl font-semibold text-gradient-gold-anim">
          🎡 命運輪盤
        </h2>
        <p className="animate-fade-up mt-1 text-sm text-muted">
          {winner === null ? "轉一轉，等命運幫你揀一杯" : "就係佢喇！"}
        </p>

        <div className="relative mx-auto mt-6 h-72 w-72">
          {/* pointer */}
          <div
            className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: "12px solid transparent",
              borderRight: "12px solid transparent",
              borderTop: "20px solid #f4d699",
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
            }}
          />
          {/* wheel */}
          <div
            className="h-72 w-72 rounded-full"
            style={{
              transform: `rotate(${rot}deg)`,
              transition: spinning
                ? `transform ${DURATION}s cubic-bezier(0.17, 0.67, 0.16, 1)`
                : "none",
              background: `repeating-conic-gradient(#2a2018 0deg ${seg}deg, #3a2c1e ${seg}deg ${seg * 2}deg)`,
              boxShadow:
                "0 0 0 6px #1b1410, 0 0 0 9px rgba(224,173,83,0.6), 0 18px 50px -16px rgba(0,0,0,0.9)",
            }}
          >
            {items.map((d, i) => (
              <div
                key={d.id}
                className="absolute left-1/2 top-1/2 origin-left"
                style={{
                  transform: `rotate(${i * seg + seg / 2}deg)`,
                  width: "50%",
                }}
              >
                <span
                  className={`block truncate pl-6 pr-2 text-xs font-medium ${
                    winner === i ? "text-accent" : "text-foreground/85"
                  }`}
                  style={{ lineHeight: "1" }}
                >
                  {d.name}
                </span>
              </div>
            ))}
            {/* hub */}
            <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-surface" />
          </div>
        </div>

        {winner === null ? (
          <button
            onClick={spin}
            disabled={spinning || n === 0}
            className="btn-gold mt-8 rounded-full px-8 py-3 text-base disabled:opacity-60"
          >
            {spinning ? "轉緊…" : "轉!"}
          </button>
        ) : (
          <div className="animate-fade-up mt-7">
            <p className="font-display text-xl font-semibold text-gradient-gold">
              {items[winner].name}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => onPick(items[winner])}
                className="btn-gold rounded-full px-5 py-2.5 text-sm"
              >
                就揀呢杯 →
              </button>
              <button
                onClick={spin}
                className="btn-ghost rounded-full px-5 py-2.5 text-sm"
              >
                🎡 再轉
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 block w-full text-sm text-muted hover:text-foreground"
        >
          收起
        </button>
      </div>
    </div>
  );
}
