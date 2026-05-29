"use client";

import { useState } from "react";

const GRADIENTS = [
  ["#4a2c1a", "#a85d2e"],
  ["#3a2342", "#8a4a7a"],
  ["#1f3a34", "#3f8f6f"],
  ["#42321a", "#c8893a"],
  ["#3a1f24", "#9a4a52"],
  ["#1e2a3a", "#3f6f9f"],
  ["#3a3418", "#b0a040"],
];

const GLASSES = ["🍸", "🍹", "🥃", "🍷", "🧉"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function DrinkImage({
  src,
  name,
  className = "",
  rounded = "rounded-2xl",
}: {
  src?: string | null;
  name: string;
  className?: string;
  rounded?: string;
}) {
  const h = hash(name || "cocktail");
  const [a, b] = GRADIENTS[h % GRADIENTS.length];
  const glass = GLASSES[(h >> 3) % GLASSES.length];

  const [loaded, setLoaded] = useState(false);

  if (src) {
    // Coloured gradient placeholder shows instantly; the photo fades in over it
    // once decoded — no jarring pop-in.
    return (
      <div
        className={`${rounded} ${className} relative overflow-hidden`}
        style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={name}
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={`${rounded} ${className} relative flex items-center justify-center overflow-hidden`}
      style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
      aria-label={name}
    >
      <span
        className="absolute -right-3 -top-3 text-5xl opacity-20 blur-[1px]"
        aria-hidden
      >
        {glass}
      </span>
      <span className="text-4xl drop-shadow-lg" aria-hidden>
        {glass}
      </span>
    </div>
  );
}
