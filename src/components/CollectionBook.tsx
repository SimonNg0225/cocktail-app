"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Drink, Order } from "@/lib/types";
import Ambient from "@/components/Ambient";
import DrinkImage from "@/components/DrinkImage";
import { recordServedOrder, getCollection, type CollEntry } from "@/lib/collection";

// Maps a guest's most-collected style into a playful "taste persona".
const PERSONA: Record<string, string> = {
  sweet: "甜系控 🍯",
  sour: "酸爽獵人 🍋",
  strong: "烈酒勇者 🔥",
  refreshing: "清爽控 🍹",
  sparkling: "氣泡愛好者 🫧",
  mocktail: "無酒精雅士 🚫",
};

export default function CollectionBook() {
  const supabase = useMemo(() => createClient(), []);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [coll, setColl] = useState<Record<string, CollEntry>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let ids: string[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem("myOrders") ?? "[]");
      if (Array.isArray(raw)) ids = raw.filter((x) => typeof x === "string");
    } catch {
      // ignore
    }
    (async () => {
      const drinksRes = await supabase
        .from("drinks")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: true });
      let served: Order[] = [];
      if (ids.length) {
        const { data } = await supabase
          .from("orders")
          .select("*, order_items(*)")
          .in("id", ids);
        served = ((data as Order[]) ?? []).filter((o) => o.status === "served");
      }
      if (!active) return;
      // Reconcile the passport from any served orders (idempotent).
      for (const o of served) {
        recordServedOrder(
          o.id,
          (o.order_items ?? []).map((it) => ({
            drink_id: it.drink_id,
            drink_name: it.drink_name,
            quantity: it.quantity,
          })),
        );
      }
      setDrinks((drinksRes.data as Drink[]) ?? []);
      setColl(getCollection());
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const collectedIds = new Set(Object.keys(coll));
  const menuIds = new Set(drinks.map((d) => d.id));
  const inMenuCollected = drinks.filter((d) => collectedIds.has(d.id));
  const extra = Object.entries(coll).filter(([id]) => !menuIds.has(id));
  const distinct = collectedIds.size;
  const totalCups = Object.values(coll).reduce((a, e) => a + e.n, 0);
  const pct = drinks.length
    ? Math.round((inMenuCollected.length / drinks.length) * 100)
    : 0;

  // Taste persona from collected drinks' tags.
  const persona = (() => {
    const tally: Record<string, number> = {};
    for (const d of inMenuCollected)
      for (const t of d.tags ?? []) tally[t] = (tally[t] ?? 0) + 1;
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (distinct < 2 || top.length === 0) return "新手探險家 ✨";
    const main = PERSONA[top[0][0]];
    const second = top[1] && PERSONA[top[1][0]];
    return second ? `${main} · 兼 ${second}` : (main ?? "品味家 🍸");
  })();

  // Achievements.
  const mocktails = drinks.filter((d) => (d.tags ?? []).includes("mocktail"));
  const achievements = [
    { emoji: "🥇", label: "首杯入賬", got: distinct >= 1 },
    { emoji: "🖐️", label: "試齊 5 款", got: distinct >= 5 },
    { emoji: "📚", label: "收藏家 · 10 款", got: distinct >= 10 },
    { emoji: "🍻", label: "老主顧 · 10 杯", got: totalCups >= 10 },
    {
      emoji: "🚫",
      label: "無酒精全集",
      got: mocktails.length > 0 && mocktails.every((d) => collectedIds.has(d.id)),
    },
  ];
  const earned = achievements.filter((a) => a.got);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10">
      <Ambient />
      <header className="mb-7 text-center animate-fade-up">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">收藏冊</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-gradient-gold-anim">
          📖 我的圖鑑
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          每飲完一杯就會蓋一個印章，集齊佢哋！
        </p>
        <Link
          href="/"
          className="btn-ghost mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm"
        >
          ← 返去酒單
        </Link>
      </header>

      {loading && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="shimmer aspect-square w-full rounded-full" />
              <div className="shimmer h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* Progress + persona */}
          <div className="card mb-6 p-5 animate-fade-up">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted">
                  收集進度
                </p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  <span className="text-gradient-gold">{inMenuCollected.length}</span>
                  <span className="text-muted-2"> / {drinks.length} 款</span>
                </p>
              </div>
              <p className="text-sm text-muted">共 {totalCups} 杯落肚 🍸</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-4 flex items-center gap-2 hairline pt-3">
              <span className="text-xs text-muted">你嘅口味人格：</span>
              <span className="rounded-full bg-accent/15 px-3 py-1 text-sm font-medium text-accent">
                {persona}
              </span>
            </div>
          </div>

          {/* Achievements */}
          {earned.length > 0 && (
            <div className="mb-6 animate-fade-up">
              <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">
                成就
              </h2>
              <div className="flex flex-wrap gap-2">
                {achievements.map((a) => (
                  <span
                    key={a.label}
                    className={`rounded-full px-3 py-1 text-sm ${
                      a.got
                        ? "bg-accent/15 text-accent"
                        : "border border-border-soft text-muted-2 opacity-60"
                    }`}
                  >
                    {a.emoji} {a.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {distinct === 0 && (
            <div className="card p-8 text-center animate-fade-in">
              <div className="text-5xl">🗂️</div>
              <p className="mt-3 text-muted">
                你嘅圖鑑仲係空白，飲完第一杯就會蓋第一個印章！
              </p>
              <Link
                href="/"
                className="btn-gold mt-5 inline-flex rounded-full px-5 py-2.5 text-sm"
              >
                去揀一杯 →
              </Link>
            </div>
          )}

          {/* Stamp grid */}
          {drinks.length > 0 && (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {drinks.map((d, i) => {
                const got = coll[d.id];
                return (
                  <div
                    key={d.id}
                    className="flex flex-col items-center gap-1.5 animate-fade-up"
                    style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}
                  >
                    <div className="relative aspect-square w-full">
                      {got ? (
                        <>
                          <DrinkImage
                            src={d.image_url}
                            name={d.name}
                            rounded="rounded-full"
                            className="h-full w-full"
                          />
                          <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-accent/60" />
                          {got.n > 1 && (
                            <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg">
                              ×{got.n}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded-full border border-dashed border-border bg-surface-2 text-2xl text-muted-2">
                          ？
                        </div>
                      )}
                    </div>
                    <p
                      className={`line-clamp-1 text-center text-xs ${
                        got ? "text-foreground" : "text-muted-2"
                      }`}
                    >
                      {got ? d.name : "未解鎖"}
                    </p>
                  </div>
                );
              })}

              {/* Collected drinks no longer on the menu */}
              {extra.map(([id, e]) => (
                <div key={id} className="flex flex-col items-center gap-1.5">
                  <div className="relative aspect-square w-full">
                    <DrinkImage
                      src={null}
                      name={e.name}
                      rounded="rounded-full"
                      className="h-full w-full"
                    />
                    <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-accent/40" />
                  </div>
                  <p className="line-clamp-1 text-center text-xs text-muted">
                    {e.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
