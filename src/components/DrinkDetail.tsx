"use client";

import { useEffect } from "react";
import type { Drink } from "@/lib/types";
import { tagLabel } from "@/lib/tags";
import { strengthInfo } from "@/lib/strength";
import DrinkImage from "@/components/DrinkImage";

// Full-screen bottom sheet (mobile) / centered card (desktop) showing one drink
// in detail: big image, description, style tags, ingredients, quantity control.
export default function DrinkDetail({
  drink,
  qty,
  isFav,
  onToggleFav,
  onClose,
  onAdd,
  onRemove,
}: {
  drink: Drink;
  qty: number;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
  onAdd: () => void;
  onRemove: () => void;
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

  const ingredients = drink.ingredients ?? [];
  const tags = drink.tags ?? [];
  const strength = strengthInfo(drink.abv);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={drink.name}
    >
      <div
        className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="glass animate-sheet-up relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl">
        <button
          onClick={onClose}
          aria-label="關閉"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg text-foreground backdrop-blur transition hover:bg-black/60"
        >
          ✕
        </button>
        <button
          onClick={onToggleFav}
          aria-label={isFav ? "取消收藏" : "收藏"}
          aria-pressed={isFav}
          className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-lg backdrop-blur transition hover:bg-black/60"
        >
          <span className={isFav ? "animate-pop" : ""}>{isFav ? "❤️" : "🤍"}</span>
        </button>

        <div className="relative aspect-[5/3] w-full overflow-hidden">
          <DrinkImage
            src={drink.image_url}
            name={drink.name}
            rounded="rounded-none"
            className="h-full w-full"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(18,13,9,0.96)] to-transparent" />
        </div>

        <div className="relative -mt-10 space-y-4 px-5 pb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">{drink.name}</h2>
            {drink.description && (
              <p className="mt-1 text-sm text-muted">{drink.description}</p>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
                >
                  {tagLabel(t)}
                </span>
              ))}
            </div>
          )}

          {(strength || drink.volume_ml != null) && (
            <div className="space-y-2 rounded-2xl border border-border-soft bg-surface-2/60 p-3.5">
              {strength && (
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">酒精濃度</span>
                    <span className="font-medium">
                      {strength.emoji} {strength.label}
                      {drink.abv != null && drink.abv > 0 && (
                        <span className="ml-1 text-muted-2">
                          · {drink.abv}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/30">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all"
                      style={{ width: `${strength.pct}%` }}
                    />
                  </div>
                </div>
              )}
              {drink.volume_ml != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">每杯容量</span>
                  <span className="font-medium">🥛 約 {drink.volume_ml}ml</span>
                </div>
              )}
            </div>
          )}

          {ingredients.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">
                材料
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {ingredients.map((i, idx) => (
                  <li
                    key={idx}
                    className="rounded-full bg-surface-2 px-3 py-1 text-sm"
                  >
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-1">
            {qty === 0 ? (
              <button
                onClick={onAdd}
                className="btn-gold w-full rounded-2xl px-5 py-3.5 text-base"
              >
                加入酒單
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-border-soft bg-surface-2 px-4 py-2.5">
                <button
                  onClick={onRemove}
                  aria-label="減一杯"
                  className="btn-ghost flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none"
                >
                  −
                </button>
                <span className="font-display text-lg font-semibold tabular-nums">
                  {qty} 杯
                </span>
                <button
                  onClick={onAdd}
                  aria-label="加一杯"
                  className="btn-gold flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none"
                >
                  +
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
