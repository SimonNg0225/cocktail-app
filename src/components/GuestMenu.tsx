"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Drink } from "@/lib/types";
import { DRINK_TAGS, tagLabel } from "@/lib/tags";
import { strengthInfo } from "@/lib/strength";
import { useFavorites } from "@/lib/useFavorites";
import { haptic } from "@/lib/haptics";
import DrinkImage from "@/components/DrinkImage";
import DrinkDetail from "@/components/DrinkDetail";
import Ambient from "@/components/Ambient";

type Suggestion = { drinkId: string; name: string; reason: string };

export default function GuestMenu() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { favs, toggle: toggleFav, isFav } = useFavorites();

  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [favOnly, setFavOnly] = useState(false);
  const [mood, setMood] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Drink | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("drinks")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) setError(error.message);
      else setDrinks((data as Drink[]) ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartDrinks = drinks.filter((d) => (cart[d.id] ?? 0) > 0);

  // Only offer filter chips for tags that actually appear on the menu.
  const presentTags = DRINK_TAGS.filter((t) =>
    drinks.some((d) => (d.tags ?? []).includes(t.id)),
  );
  // AND filter: a drink must carry every active tag (and be a favourite if 收藏-only).
  const visible = drinks.filter(
    (d) =>
      activeTags.every((t) => (d.tags ?? []).includes(t)) &&
      (!favOnly || isFav(d.id)),
  );

  function toggleTag(id: string) {
    setActiveTags((cur) =>
      cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id],
    );
  }

  function focusDrink(id: string) {
    setActiveTags([]); // make sure the picked drink isn't filtered out
    setFavOnly(false);
    setHighlightId(id);
    window.setTimeout(() => {
      document
        .getElementById(`drink-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    window.setTimeout(
      () => setHighlightId((cur) => (cur === id ? null : cur)),
      2600,
    );
  }

  function randomPick() {
    const pool = visible.length > 0 ? visible : drinks;
    if (pool.length === 0) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setSuggestion({
      drinkId: pick.id,
      name: pick.name,
      reason: "幫你隨機揀咗一杯 🎲",
    });
    focusDrink(pick.id);
  }

  async function aiPick() {
    setSuggesting(true);
    setSuggestion(null);
    try {
      const res = await fetch("/api/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood }),
      });
      const data = await res.json();
      if (res.ok && data.drinkId) {
        setSuggestion({
          drinkId: data.drinkId,
          name: data.name,
          reason: data.reason,
        });
        focusDrink(data.drinkId);
      }
    } catch {
      // network hiccup — silently let the guest browse the menu
    }
    setSuggesting(false);
  }

  function add(id: string) {
    haptic("light");
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  }
  function remove(id: string) {
    haptic("light");
    setCart((c) => {
      const next = { ...c };
      const qty = (next[id] ?? 0) - 1;
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  async function placeOrder() {
    if (!name.trim()) {
      setError("請輸入你個名");
      return;
    }
    if (totalItems === 0) return;
    setSubmitting(true);
    setError(null);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({ guest_name: name.trim(), note: note.trim() || null })
      .select()
      .single();

    if (orderErr || !order) {
      setError(orderErr?.message ?? "落單失敗");
      setSubmitting(false);
      return;
    }

    const items = cartDrinks.map((d) => ({
      order_id: order.id,
      drink_id: d.id,
      drink_name: d.name,
      quantity: cart[d.id],
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(items);
    if (itemsErr) {
      setError(itemsErr.message);
      setSubmitting(false);
      return;
    }

    try {
      const mine: string[] = JSON.parse(localStorage.getItem("myOrders") ?? "[]");
      mine.unshift(order.id);
      localStorage.setItem("myOrders", JSON.stringify(mine.slice(0, 20)));
    } catch {}

    haptic("success");
    router.push(`/order/${order.id}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-36 pt-10">
      <Ambient />
      <header className="mb-9 text-center animate-fade-up">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-accent/40 text-2xl">
          🍸
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-accent">屋企調酒吧</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-gradient-gold-anim">
          今晚飲咩好？
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          揀你心水嗰杯，落單俾調酒師，坐低等享受。
        </p>
        <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-accent/60 to-transparent" />
        <Link
          href="/stars"
          className="btn-ghost mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm"
        >
          🏆 今晚之星排行榜 →
        </Link>
      </header>

      {loading && (
        <ul className="space-y-4">
          {[0, 1, 2].map((i) => (
            <li key={i} className="card flex gap-4 p-3">
              <div className="shimmer h-20 w-20 rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <div className="shimmer h-4 w-1/2 rounded" />
                <div className="shimmer h-3 w-3/4 rounded" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && drinks.length === 0 && (
        <div className="card p-8 text-center animate-fade-in">
          <div className="text-4xl">🥂</div>
          <p className="mt-3 text-muted">
            調酒師整緊酒單，等陣再嚟睇睇 🍸
          </p>
        </div>
      )}

      {!loading && drinks.length > 0 && (
        <div className="card mb-6 space-y-3 p-4 animate-fade-up">
          <div>
            <h2 className="font-display text-lg font-semibold">唔知揀咩好？</h2>
            <p className="text-sm text-muted">
              講吓你想點，等調酒師幫你揀一杯。
            </p>
          </div>
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") aiPick();
            }}
            placeholder="例如：清爽唔太甜、想要有氣"
            className="field w-full px-4 py-2.5 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={aiPick}
              disabled={suggesting}
              className="btn-gold rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"
            >
              {suggesting ? "諗緊…" : "✨ 幫我揀"}
            </button>
            <button
              onClick={randomPick}
              disabled={suggesting}
              className="btn-ghost rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"
            >
              🎲 隨機一杯
            </button>
          </div>
        </div>
      )}

      {suggestion && (
        <div className="card flash-once animate-fade-up mb-6 border-accent/40 p-4">
          <p className="text-xs uppercase tracking-wide text-accent">✨ 為你推薦</p>
          <h3 className="mt-1 font-display text-lg font-semibold text-gradient-gold">
            {suggestion.name}
          </h3>
          <p className="mt-0.5 text-sm text-muted">{suggestion.reason}</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                add(suggestion.drinkId);
                focusDrink(suggestion.drinkId);
              }}
              className="btn-gold rounded-full px-4 py-1.5 text-sm"
            >
              加入呢杯
            </button>
            <button
              onClick={() => setSuggestion(null)}
              className="btn-ghost rounded-full px-4 py-1.5 text-sm"
            >
              唔啱，再揀
            </button>
          </div>
        </div>
      )}

      {!loading && (presentTags.length > 0 || favs.length > 0) && (
        <div className="filter-rail -mx-4 mb-5 px-4 py-2.5">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {favs.length > 0 && (
              <button
                onClick={() => {
                  haptic("light");
                  setFavOnly((v) => !v);
                }}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                  favOnly ? "btn-gold" : "btn-ghost"
                }`}
              >
                ❤️ 我的收藏
              </button>
            )}
            {presentTags.map((t) => {
              const on = activeTags.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    haptic("light");
                    toggleTag(t.id);
                  }}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium ${
                    on ? "btn-gold" : "btn-ghost"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              );
            })}
            {(activeTags.length > 0 || favOnly) && (
              <button
                onClick={() => {
                  setActiveTags([]);
                  setFavOnly(false);
                }}
                className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm text-muted hover:text-foreground"
              >
                清除
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && drinks.length > 0 && visible.length === 0 && (
        <div className="card p-8 text-center animate-fade-in">
          <p className="text-muted">
            {favOnly && activeTags.length === 0
              ? "你仲未收藏任何一杯，撳卡片上面個 🤍 試吓 ❤️"
              : "冇酒符合呢個篩選 🤔"}
          </p>
          <button
            onClick={() => {
              setActiveTags([]);
              setFavOnly(false);
            }}
            className="btn-ghost mt-3 rounded-full px-4 py-1.5 text-sm"
          >
            清除篩選
          </button>
        </div>
      )}

      <ul className="space-y-4">
        {visible.map((d, i) => {
          const qty = cart[d.id] ?? 0;
          const ingredients = d.ingredients ?? [];
          const tags = d.tags ?? [];
          const strength = strengthInfo(d.abv);
          const fav = isFav(d.id);
          return (
            <li
              key={d.id}
              id={`drink-${d.id}`}
              className={`card card-hover relative flex items-center gap-4 p-3 animate-fade-up transition-shadow ${
                highlightId === d.id ? "ring-2 ring-accent" : ""
              }`}
              style={{ animationDelay: `${Math.min(i * 60, 360)}ms` }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  haptic("light");
                  toggleFav(d.id);
                }}
                aria-label={fav ? "取消收藏" : "收藏"}
                aria-pressed={fav}
                className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-sm backdrop-blur transition hover:bg-black/65"
              >
                <span className={fav ? "animate-pop" : ""}>
                  {fav ? "❤️" : "🤍"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSelected(d)}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
              >
                <div className="relative h-20 w-20 shrink-0">
                  <DrinkImage
                    src={d.image_url}
                    name={d.name}
                    rounded="rounded-xl"
                    className="h-full w-full"
                  />
                  {strength && (
                    <span
                      className="strength-dot absolute bottom-1 right-1 h-3 w-3 rounded-full"
                      style={{
                        background: strength.color,
                        ["--dot" as string]: strength.color,
                      }}
                      title={strength.label}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-semibold leading-tight">
                    {d.name}
                  </h2>
                  {d.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {d.description}
                    </p>
                  )}
                  {ingredients.length > 0 && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-2">
                      材料：{ingredients.join("、")}
                    </p>
                  )}
                  {(tags.length > 0 || strength) && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {strength && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                          {strength.emoji} {strength.label}
                          {d.abv != null && d.abv > 0 && ` ${d.abv}%`}
                        </span>
                      )}
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
              </button>
              {qty === 0 ? (
                <button
                  onClick={() => add(d.id)}
                  className="btn-gold shrink-0 rounded-full px-4 py-2 text-sm"
                >
                  加入
                </button>
              ) : (
                <div className="flex shrink-0 items-center gap-2.5">
                  <button
                    onClick={() => remove(d.id)}
                    className="btn-ghost flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none"
                  >
                    −
                  </button>
                  <span
                    key={qty}
                    className="animate-bump w-4 text-center font-semibold tabular-nums"
                  >
                    {qty}
                  </span>
                  <button
                    onClick={() => add(d.id)}
                    className="btn-gold flex h-8 w-8 items-center justify-center rounded-full text-lg leading-none"
                  >
                    +
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {totalItems > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-10">
          <div className="pointer-events-none h-10 bg-gradient-to-t from-background to-transparent" />
          <div className="border-t border-border-soft bg-surface/85 backdrop-blur-xl">
            <div className="mx-auto w-full max-w-2xl px-4 py-3">
              {!sheetOpen ? (
                <button
                  onClick={() => setSheetOpen(true)}
                  className="btn-gold flex w-full items-center justify-between rounded-2xl px-5 py-3.5"
                >
                  <span className="flex items-center gap-2">
                    <span
                      key={totalItems}
                      className="animate-bump flex h-6 min-w-6 items-center justify-center rounded-full bg-accent-fg/15 px-1.5 text-sm tabular-nums"
                    >
                      {totalItems}
                    </span>
                    查看訂單
                  </span>
                  <span className="font-display">落單 →</span>
                </button>
              ) : (
                <div className="animate-rise space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-semibold">你嘅訂單</h3>
                    <button
                      onClick={() => setSheetOpen(false)}
                      className="text-sm text-muted hover:text-foreground"
                    >
                      收起 ↓
                    </button>
                  </div>
                  <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
                    {cartDrinks.map((d) => (
                      <li key={d.id} className="flex justify-between">
                        <span>{d.name}</span>
                        <span className="text-muted tabular-nums">× {cart[d.id]}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="hairline" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="你個名（俾調酒師叫你）"
                    className="field w-full px-4 py-2.5"
                  />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="備註（例如：少冰、淡啲）"
                    className="field w-full px-4 py-2.5 text-sm"
                  />
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <button
                    onClick={placeOrder}
                    disabled={submitting}
                    className="btn-gold w-full rounded-2xl px-5 py-3.5 disabled:opacity-60"
                  >
                    {submitting ? "落緊單…" : `確認落單 · ${totalItems} 杯`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <DrinkDetail
          drink={selected}
          qty={cart[selected.id] ?? 0}
          isFav={isFav(selected.id)}
          onToggleFav={() => toggleFav(selected.id)}
          onClose={() => setSelected(null)}
          onAdd={() => add(selected.id)}
          onRemove={() => remove(selected.id)}
        />
      )}
    </div>
  );
}
