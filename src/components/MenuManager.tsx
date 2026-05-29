"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Drink } from "@/lib/types";
import { DRINK_TAGS } from "@/lib/tags";
import DrinkImage from "@/components/DrinkImage";

// Split a free-text ingredient list on commas / newlines / Chinese punctuation.
function parseList(text: string): string[] {
  const seen = new Set<string>();
  for (const part of text.split(/[\n,，、·]+/)) {
    const v = part.trim();
    if (v) seen.add(v);
  }
  return [...seen];
}

// Parse a numeric host input; blank / non-numeric → null (clears the column).
function parseNum(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function MenuManager() {
  const supabase = useMemo(() => createClient(), []);
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [recipe, setRecipe] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [abvText, setAbvText] = useState("");
  const [volText, setVolText] = useState("");
  const [adding, setAdding] = useState(false);
  const [ingEdits, setIngEdits] = useState<Record<string, string>>({});
  const [genId, setGenId] = useState<string | null>(null);
  const [genError, setGenError] = useState<Record<string, string>>({});
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });

  async function load() {
    const { data } = await supabase
      .from("drinks")
      .select("*")
      .order("created_at", { ascending: false });
    setDrinks((data as Drink[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    const { data } = await supabase
      .from("drinks")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        recipe: recipe.trim() || null,
        ingredients: parseList(ingredientsText),
        tags: formTags,
        abv: parseNum(abvText),
        volume_ml: parseNum(volText),
        source: "manual",
      })
      .select()
      .single();
    if (data) setDrinks((prev) => [data as Drink, ...prev]);
    setName("");
    setDescription("");
    setRecipe("");
    setIngredientsText("");
    setFormTags([]);
    setAbvText("");
    setVolText("");
    setAdding(false);
  }

  async function toggle(d: Drink) {
    setDrinks((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, is_available: !x.is_available } : x)),
    );
    await supabase
      .from("drinks")
      .update({ is_available: !d.is_available })
      .eq("id", d.id);
  }

  async function remove(id: string) {
    setDrinks((prev) => prev.filter((d) => d.id !== id));
    await supabase.from("drinks").delete().eq("id", id);
  }

  // Optimistic field update for an existing drink.
  async function patchDrink(id: string, patch: Partial<Drink>) {
    setDrinks((prev) =>
      prev.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
    await supabase.from("drinks").update(patch).eq("id", id);
  }

  function toggleTag(d: Drink, tagId: string) {
    const cur = d.tags ?? [];
    const next = cur.includes(tagId)
      ? cur.filter((t) => t !== tagId)
      : [...cur, tagId];
    patchDrink(d.id, { tags: next });
  }

  function toggleFormTag(tagId: string) {
    setFormTags((cur) =>
      cur.includes(tagId) ? cur.filter((t) => t !== tagId) : [...cur, tagId],
    );
  }

  function saveIngredients(d: Drink, text: string) {
    const next = parseList(text);
    if (JSON.stringify(next) === JSON.stringify(d.ingredients ?? [])) return;
    patchDrink(d.id, { ingredients: next });
  }

  function saveNum(d: Drink, field: "abv" | "volume_ml", text: string) {
    const val = parseNum(text);
    if ((d[field] ?? null) === val) return;
    patchDrink(d.id, { [field]: val } as Partial<Drink>);
  }

  async function generateImageFor(d: Drink): Promise<boolean> {
    setGenError((m) => ({ ...m, [d.id]: "" }));
    try {
      const res = await fetch("/api/drink-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: d.name, description: d.description }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        setGenError((m) => ({ ...m, [d.id]: data.error ?? "生成失敗" }));
        return false;
      }
      setDrinks((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, image_url: data.imageUrl } : x)),
      );
      await supabase
        .from("drinks")
        .update({ image_url: data.imageUrl })
        .eq("id", d.id);
      return true;
    } catch {
      setGenError((m) => ({ ...m, [d.id]: "網絡錯誤" }));
      return false;
    }
  }

  async function generateImage(d: Drink) {
    setGenId(d.id);
    await generateImageFor(d);
    setGenId(null);
  }

  async function batchGenerate() {
    const targets = drinks.filter((d) => !d.image_url);
    if (targets.length === 0) return;
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      setGenId(targets[i].id);
      await generateImageFor(targets[i]);
      setBatchProgress({ done: i + 1, total: targets.length });
    }
    setGenId(null);
    setBatchRunning(false);
  }

  const missingCount = drinks.filter((d) => !d.image_url).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">酒單</h2>
        <p className="text-sm text-muted">供應中嘅調酒先會喺客人嗰邊出現。</p>
      </div>

      <form onSubmit={add} className="card space-y-2.5 p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="調酒名（例如：Negroni）"
          className="field w-full px-4 py-2.5"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="簡介（客人睇到）"
          className="field w-full px-4 py-2.5 text-sm"
        />
        <textarea
          value={recipe}
          onChange={(e) => setRecipe(e.target.value)}
          placeholder="配方／做法（淨係你睇到）"
          rows={2}
          className="field w-full px-4 py-2.5 text-sm"
        />
        <input
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder="材料（客人睇到，用、或逗號分隔）"
          className="field w-full px-4 py-2.5 text-sm"
        />
        <div className="flex gap-2.5">
          <input
            value={abvText}
            onChange={(e) => setAbvText(e.target.value)}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            placeholder="酒精濃度 %（例：18）"
            className="field w-1/2 px-4 py-2.5 text-sm"
          />
          <input
            value={volText}
            onChange={(e) => setVolText(e.target.value)}
            type="number"
            inputMode="numeric"
            min={0}
            step="10"
            placeholder="容量 ml（例：120）"
            className="field w-1/2 px-4 py-2.5 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {DRINK_TAGS.map((t) => {
            const on = formTags.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleFormTag(t.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium ${
                  on ? "btn-gold" : "btn-ghost"
                }`}
              >
                {t.emoji} {t.label}
              </button>
            );
          })}
        </div>
        <button
          type="submit"
          disabled={adding}
          className="btn-gold rounded-xl px-5 py-2.5 disabled:opacity-60"
        >
          加入酒單
        </button>
      </form>

      {!loading && drinks.length > 0 && (missingCount > 0 || batchRunning) && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-medium">一鍵幫所有酒生圖</p>
            <p className="text-sm text-muted">
              {batchRunning
                ? `生成緊 ${batchProgress.done}/${batchProgress.total}… 逐杯整緊，請唔好閂頁。`
                : `仲有 ${missingCount} 杯未有圖，一次過幫晒佢哋整。`}
            </p>
          </div>
          <button
            onClick={batchGenerate}
            disabled={batchRunning}
            className="btn-gold shrink-0 rounded-xl px-5 py-2.5 disabled:opacity-60"
          >
            {batchRunning
              ? `🎨 ${batchProgress.done}/${batchProgress.total}`
              : `✨ 批量生成圖（${missingCount}）`}
          </button>
        </div>
      )}

      {loading ? (
        <ul className="space-y-3">
          {[0, 1].map((i) => (
            <li key={i} className="card flex gap-4 p-4">
              <div className="shimmer h-24 w-24 rounded-xl" />
              <div className="flex-1 space-y-2 py-1">
                <div className="shimmer h-4 w-1/3 rounded" />
                <div className="shimmer h-3 w-2/3 rounded" />
              </div>
            </li>
          ))}
        </ul>
      ) : drinks.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          仲未有調酒，加一杯或者去「AI 配方」拎靈感。
        </div>
      ) : (
        <ul className="space-y-3">
          {drinks.map((d) => (
            <li
              key={d.id}
              className={`card p-4 ${d.is_available ? "" : "opacity-60"}`}
            >
              <div className="flex gap-4">
                <DrinkImage
                  src={d.image_url}
                  name={d.name}
                  rounded="rounded-xl"
                  className="h-24 w-24 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">{d.name}</h3>
                      {d.source === "ai" && (
                        <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                          AI
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => remove(d.id)}
                      className="shrink-0 text-muted-2 hover:text-danger"
                      title="刪除"
                    >
                      ✕
                    </button>
                  </div>
                  {d.description && (
                    <p className="mt-0.5 text-sm text-muted">{d.description}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => toggle(d)}
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        d.is_available
                          ? "bg-success/15 text-success"
                          : "btn-ghost"
                      }`}
                    >
                      {d.is_available ? "● 供應中" : "○ 已落架"}
                    </button>
                    <button
                      onClick={() => generateImage(d)}
                      disabled={genId === d.id || batchRunning}
                      className="btn-ghost rounded-full px-3 py-1 text-sm disabled:opacity-60"
                    >
                      {genId === d.id
                        ? "🎨 生成緊…"
                        : d.image_url
                          ? "↻ 重新生成圖"
                          : "✨ AI 生成圖"}
                    </button>
                  </div>
                  {genError[d.id] && (
                    <p className="mt-2 text-sm text-danger">{genError[d.id]}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {DRINK_TAGS.map((t) => {
                      const on = (d.tags ?? []).includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTag(d, t.id)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            on
                              ? "bg-accent/20 text-accent"
                              : "bg-surface-2 text-muted-2 hover:text-fg"
                          }`}
                        >
                          {t.emoji} {t.label}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    value={ingEdits[d.id] ?? (d.ingredients ?? []).join("、")}
                    onChange={(e) =>
                      setIngEdits((m) => ({ ...m, [d.id]: e.target.value }))
                    }
                    onBlur={(e) => saveIngredients(d, e.target.value)}
                    placeholder="材料（客人睇到，用、或逗號分隔）"
                    className="field mt-2 w-full px-3 py-1.5 text-xs"
                  />
                  <div className="mt-2 flex gap-2">
                    <label className="flex flex-1 items-center gap-1.5 text-xs text-muted-2">
                      🥃 %
                      <input
                        defaultValue={d.abv ?? ""}
                        onBlur={(e) => saveNum(d, "abv", e.target.value)}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.5"
                        placeholder="酒精濃度"
                        className="field w-full px-3 py-1.5 text-xs"
                      />
                    </label>
                    <label className="flex flex-1 items-center gap-1.5 text-xs text-muted-2">
                      🥛 ml
                      <input
                        defaultValue={d.volume_ml ?? ""}
                        onBlur={(e) => saveNum(d, "volume_ml", e.target.value)}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step="10"
                        placeholder="容量"
                        className="field w-full px-3 py-1.5 text-xs"
                      />
                    </label>
                  </div>
                </div>
              </div>
              {d.recipe && (
                <p className="mt-3 whitespace-pre-wrap rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
                  {d.recipe}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
