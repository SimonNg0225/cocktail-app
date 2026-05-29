"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Drink, Order } from "@/lib/types";
import Ambient from "@/components/Ambient";
import DrinkImage from "@/components/DrinkImage";
import { recordServedOrder, getCollection, type CollEntry } from "@/lib/collection";

// Maps a guest's most-collected style into a playful "taste persona".
const PERSONA: Record<string, string> = {
  sweet: "甜系控",
  sour: "酸爽獵人",
  strong: "烈酒勇者",
  refreshing: "清爽控",
  sparkling: "氣泡愛好者",
  mocktail: "無酒精雅士",
};

function stampDate(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

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
  const level = distinct === 0 ? 0 : Math.floor(distinct / 3) + 1;

  const persona = (() => {
    const tally: Record<string, number> = {};
    for (const d of inMenuCollected)
      for (const t of d.tags ?? []) tally[t] = (tally[t] ?? 0) + 1;
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    if (distinct < 2 || top.length === 0) return "新手探險家";
    const main = PERSONA[top[0][0]] ?? "品味家";
    const second = top[1] && PERSONA[top[1][0]];
    return second ? `${main} · 兼 ${second}` : main;
  })();

  const mocktails = drinks.filter((d) => (d.tags ?? []).includes("mocktail"));
  const achievements = [
    { label: "首杯入賬", got: distinct >= 1 },
    { label: "試齊 5 款", got: distinct >= 5 },
    { label: "收藏家 · 10 款", got: distinct >= 10 },
    { label: "老主顧 · 10 杯", got: totalCups >= 10 },
    {
      label: "無酒精全集",
      got: mocktails.length > 0 && mocktails.every((d) => collectedIds.has(d.id)),
    },
  ].filter((a) => a.got);

  // Deterministic slight rotation per slot, for that hand-stamped feel.
  const rot = (i: number) => ((i * 37) % 9) - 4;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10">
      <Ambient />
      <header className="mb-6 text-center animate-fade-up">
        <p className="text-[0.7rem] uppercase tracking-[0.5em] text-accent">
          Tasting Passport
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-gradient-gold-anim">
          品味護照
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          每飲完一杯，蓋一個專屬印章。
        </p>
      </header>

      {loading && (
        <div className="passport p-5">
          <div className="passport-frame" />
          <div className="relative z-10 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="shimmer h-20 w-20 rounded-full" />
                <div className="shimmer h-3 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (
        <>
          {/* Passport cover / hero */}
          <div className="passport mb-6 p-5 animate-fade-up">
            <div className="passport-frame" />
            <div className="relative z-10 flex items-center gap-5">
              <div
                className="wax-ring h-[88px] w-[88px] shrink-0"
                style={{ ["--p" as string]: pct }}
              >
                <div className="wax-ring-inner flex h-full w-full flex-col items-center justify-center">
                  <span className="font-display text-xl font-semibold leading-none text-gradient-gold">
                    {inMenuCollected.length}
                  </span>
                  <span className="mt-0.5 text-[0.65rem] text-muted-2">
                    / {drinks.length}
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-2">
                  持有人
                </p>
                <p className="font-display text-xl font-semibold">
                  {level === 0 ? "新手" : `品酒師 Lv.${level}`}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-accent/40 px-2.5 py-0.5 text-xs font-medium text-accent">
                    {persona}
                  </span>
                  <span className="text-xs text-muted-2">共 {totalCups} 杯落肚</span>
                </div>
              </div>
            </div>
          </div>

          {achievements.length > 0 && (
            <div className="mb-6 animate-fade-up">
              <h2 className="mb-2 text-xs uppercase tracking-[0.2em] text-muted">
                徽章
              </h2>
              <div className="flex flex-wrap gap-2">
                {achievements.map((a) => (
                  <span
                    key={a.label}
                    className="rounded-full bg-accent/12 px-3 py-1 text-sm text-accent ring-1 ring-accent/25"
                  >
                    🏅 {a.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {distinct === 0 && (
            <div className="passport p-8 text-center animate-fade-in">
              <div className="passport-frame" />
              <div className="relative z-10">
                <div className="text-5xl">🗂️</div>
                <p className="mt-3 text-muted">
                  護照仲係空白，飲完第一杯就蓋第一個印章！
                </p>
              </div>
            </div>
          )}

          {/* Stamp page */}
          {drinks.length > 0 && (
            <div className="passport p-5 sm:p-6 animate-fade-up">
              <div className="passport-frame" />
              <div className="relative z-10 grid grid-cols-3 gap-x-3 gap-y-7 sm:grid-cols-4">
                {drinks.map((d, i) => {
                  const got = coll[d.id];
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col items-center gap-2 animate-fade-up"
                      style={{ animationDelay: `${Math.min(i * 45, 360)}ms` }}
                    >
                      {got ? (
                        <div
                          className="seal relative h-20 w-20"
                          style={{ ["--rot" as string]: `${rot(i)}deg` }}
                        >
                          <div className="seal-ring h-20 w-20">
                            <DrinkImage
                              src={d.image_url}
                              name={d.name}
                              rounded="rounded-full"
                              className="h-20 w-20"
                            />
                          </div>
                          {got.n > 1 && (
                            <span className="absolute -bottom-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-fg shadow">
                              ×{got.n}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          className="seal-empty flex h-20 w-20 items-center justify-center"
                          style={{ transform: `rotate(${rot(i)}deg)` }}
                        >
                          <span className="text-3xl opacity-20">🍸</span>
                        </div>
                      )}
                      <p
                        className={`line-clamp-1 text-center text-xs ${
                          got ? "text-foreground" : "text-muted-2"
                        }`}
                      >
                        {got ? d.name : "待蓋章"}
                      </p>
                      {got && (
                        <p className="-mt-1 text-[0.65rem] tracking-wide text-muted-2">
                          {stampDate(got.first)}
                        </p>
                      )}
                    </div>
                  );
                })}

                {extra.map(([id, e], i) => (
                  <div
                    key={id}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="seal relative h-20 w-20"
                      style={{ ["--rot" as string]: `${rot(i + 99)}deg` }}
                    >
                      <div className="seal-ring h-20 w-20">
                        <DrinkImage
                          src={null}
                          name={e.name}
                          rounded="rounded-full"
                          className="h-20 w-20"
                        />
                      </div>
                    </div>
                    <p className="line-clamp-1 text-center text-xs text-muted">
                      {e.name}
                    </p>
                    <p className="-mt-1 text-[0.65rem] tracking-wide text-muted-2">
                      {stampDate(e.first)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
