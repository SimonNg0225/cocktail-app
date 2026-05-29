// Maps an approximate ABV (%) to a guest-friendly strength label + meter fill.
export type Strength = {
  pct: number; // 0–100 meter fill
  label: string;
  emoji: string;
};

export function strengthInfo(abv?: number | null): Strength | null {
  if (abv == null || Number.isNaN(abv)) return null;
  if (abv <= 0) return { pct: 0, label: "無酒精", emoji: "🚫" };
  // ~40% maps to a full bar; clamp so even light drinks show a sliver.
  const pct = Math.max(10, Math.min(100, Math.round((abv / 40) * 100)));
  if (abv < 8) return { pct, label: "輕怡", emoji: "🍃" };
  if (abv < 18) return { pct, label: "中度", emoji: "🥃" };
  if (abv < 28) return { pct, label: "偏烈", emoji: "🔥" };
  return { pct, label: "勁烈", emoji: "💥" };
}
