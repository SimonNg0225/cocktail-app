"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Drink } from "@/lib/types";
import { tagLabel } from "@/lib/tags";
import DrinkImage from "@/components/DrinkImage";
import Ambient from "@/components/Ambient";

type ItemRow = {
  drink_id: string | null;
  drink_name: string;
  quantity: number;
  order_id: string;
};
type OrderRow = { id: string; status: string };

type Ranked = {
  key: string;
  name: string;
  qty: number;
  drink?: Drink;
};

// Public, live leaderboard of the most-ordered drinks tonight.
// Aggregates order_items client-side (anon can read orders/order_items),
// excluding cancelled orders. Realtime re-fetch keeps the board fresh.
export default function StarsBoard() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [itemsRes, ordersRes, drinksRes] = await Promise.all([
      supabase
        .from("order_items")
        .select("drink_id, drink_name, quantity, order_id"),
      supabase.from("orders").select("id, status"),
      supabase.from("drinks").select("*").eq("is_available", true),
    ]);
    setItems((itemsRes.data as ItemRow[]) ?? []);
    setOrders((ordersRes.data as OrderRow[]) ?? []);
    setDrinks((drinksRes.data as Drink[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const channel = supabase
      .channel("stars-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  const { ranked, totalGlasses } = useMemo(() => {
    const cancelled = new Set(
      orders.filter((o) => o.status === "cancelled").map((o) => o.id),
    );
    const byId = new Map<string, Drink>();
    for (const d of drinks) byId.set(d.id, d);

    const tally = new Map<string, Ranked>();
    let glasses = 0;
    for (const it of items) {
      if (cancelled.has(it.order_id)) continue;
      const key = it.drink_id ?? `name:${it.drink_name}`;
      glasses += it.quantity;
      const prev = tally.get(key);
      if (prev) {
        prev.qty += it.quantity;
      } else {
        tally.set(key, {
          key,
          name: it.drink_name,
          qty: it.quantity,
          drink: it.drink_id ? byId.get(it.drink_id) : undefined,
        });
      }
    }
    const list = [...tally.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
    return { ranked: list, totalGlasses: glasses };
  }, [items, orders, drinks]);

  const top = ranked[0];
  const rest = ranked.slice(1);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10">
      <Ambient />
      <header className="mb-7 text-center animate-fade-up">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">
          今晚排行榜
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-gradient-gold-anim">
          🏆 今晚之星
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          邊杯最多人鍾意？即時更新嘅人氣榜。
        </p>
        <Link
          href="/"
          className="btn-ghost mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm"
        >
          ← 返去酒單
        </Link>
      </header>

      {loading && (
        <div className="space-y-4">
          <div className="card h-56 animate-pulse" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="card flex items-center gap-4 p-3">
              <div className="shimmer h-9 w-9 rounded-full" />
              <div className="shimmer h-14 w-14 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="shimmer h-4 w-1/2 rounded" />
                <div className="shimmer h-3 w-1/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && ranked.length === 0 && (
        <div className="card p-10 text-center animate-fade-in">
          <div className="text-5xl">🥂</div>
          <p className="mt-4 text-muted">今晚仲未有人落單，做第一個啦！</p>
          <Link
            href="/"
            className="btn-gold mt-5 inline-flex rounded-full px-5 py-2.5 text-sm"
          >
            睇酒單落單 →
          </Link>
        </div>
      )}

      {!loading && top && (
        <>
          <p className="mb-5 text-center text-sm text-muted-2">
            全場已落 <span className="text-accent">{totalGlasses}</span> 杯 ·{" "}
            {ranked.length} 款上榜
          </p>

          {/* #1 — tonight's star */}
          <div className="card relative mb-6 overflow-hidden border-accent/40 p-6 text-center animate-fade-up">
            <div className="pointer-events-none absolute -top-16 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl" />
            <p className="relative text-xs uppercase tracking-[0.3em] text-accent">
              👑 今晚之星
            </p>
            <div className="relative mx-auto mt-4 h-32 w-32">
              <DrinkImage
                src={top.drink?.image_url}
                name={top.name}
                rounded="rounded-2xl"
                className="h-32 w-32 shadow-lg shadow-black/40"
              />
              <div className="absolute -right-3 -top-4 rotate-12 text-4xl drop-shadow-lg">
                👑
              </div>
            </div>
            <h2 className="relative mt-4 font-display text-2xl font-semibold text-gradient-gold-anim">
              {top.name}
            </h2>
            <p className="relative mt-1 text-sm text-muted">
              已落單 {top.qty} 杯 · 全場人氣冠軍 🥇
            </p>
            {top.drink?.tags && top.drink.tags.length > 0 && (
              <div className="relative mt-3 flex flex-wrap justify-center gap-1.5">
                {top.drink.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
                  >
                    {tagLabel(t)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* #2 onwards */}
          {rest.length > 0 && (
            <ul className="space-y-3">
              {rest.map((r, idx) => {
                const rank = idx + 2;
                const medal =
                  rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
                const tags = r.drink?.tags ?? [];
                return (
                  <li
                    key={r.key}
                    className="card flex items-center gap-3.5 p-3 animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx * 60, 300)}ms` }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-base font-semibold tabular-nums">
                      {medal}
                    </div>
                    <DrinkImage
                      src={r.drink?.image_url}
                      name={r.name}
                      rounded="rounded-xl"
                      className="h-14 w-14 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-display text-base font-semibold">
                        {r.name}
                      </h3>
                      {tags.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-2"
                            >
                              {tagLabel(t)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg font-semibold text-gradient-gold">
                        {r.qty}
                      </p>
                      <p className="text-[0.7rem] text-muted-2">杯</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
