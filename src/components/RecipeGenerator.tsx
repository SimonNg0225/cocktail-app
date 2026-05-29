"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validTags } from "@/lib/tags";

type Recipe = {
  name: string;
  description: string;
  ingredients: string[];
  steps: string[];
  tags?: string[];
  abv?: number;
};

function recipeToText(r: Recipe) {
  return [
    "材料：\n" + r.ingredients.map((i) => `· ${i}`).join("\n"),
    "做法：\n" + r.steps.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  ].join("\n\n");
}

export default function RecipeGenerator() {
  const [preference, setPreference] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [oneClick, setOneClick] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const busy = loading || oneClick || addingAll;

  async function fetchRecipes(): Promise<Recipe[] | null> {
    const res = await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preference }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "生成失敗");
      return null;
    }
    return (data.recipes ?? []) as Recipe[];
  }

  async function insertRecipes(rs: Recipe[]): Promise<boolean> {
    const supabase = createClient();
    const rows = rs.map((r) => ({
      name: r.name,
      description: r.description,
      recipe: recipeToText(r),
      ingredients: r.ingredients ?? [],
      tags: validTags(r.tags),
      abv: typeof r.abv === "number" && !Number.isNaN(r.abv) ? r.abv : null,
      source: "ai" as const,
      is_available: true,
    }));
    const { error } = await supabase.from("drinks").insert(rows);
    return !error;
  }

  // Preview only — host picks which to add.
  async function generate() {
    setLoading(true);
    setError(null);
    setNotice(null);
    setRecipes([]);
    setAdded({});
    try {
      const rs = await fetchRecipes();
      if (rs) setRecipes(rs);
    } catch {
      setError("網絡錯誤");
    }
    setLoading(false);
  }

  // One click: generate + insert the whole menu.
  async function oneClickMenu() {
    setOneClick(true);
    setError(null);
    setNotice(null);
    setRecipes([]);
    setAdded({});
    try {
      const rs = await fetchRecipes();
      if (rs && rs.length > 0) {
        setRecipes(rs);
        const ok = await insertRecipes(rs);
        if (ok) {
          setAdded(Object.fromEntries(rs.map((r) => [r.name, true])));
          setNotice(
            `一鍵完成！已加入 ${rs.length} 杯落酒單 🍸 去「酒單」撳「批量生成圖」幫佢哋整相。`,
          );
        } else {
          setError("加入酒單失敗，請再試。");
        }
      } else if (rs) {
        setError("AI 冇返到配方，請再試。");
      }
    } catch {
      setError("網絡錯誤");
    }
    setOneClick(false);
  }

  async function addToMenu(r: Recipe) {
    const ok = await insertRecipes([r]);
    if (ok) setAdded((m) => ({ ...m, [r.name]: true }));
  }

  async function addAll() {
    const remaining = recipes.filter((r) => !added[r.name]);
    if (remaining.length === 0) return;
    setAddingAll(true);
    setError(null);
    const ok = await insertRecipes(remaining);
    if (ok) {
      setAdded((m) => {
        const next = { ...m };
        remaining.forEach((r) => (next[r.name] = true));
        return next;
      });
      setNotice(`已加入 ${remaining.length} 杯落酒單 🍸`);
    } else {
      setError("加入酒單失敗，請再試。");
    }
    setAddingAll(false);
  }

  const remainingCount = recipes.filter((r) => !added[r.name]).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">AI 調酒配方</h2>
        <p className="text-sm text-muted">
          根據你「庫存」入面有貨嘅材料，AI 幫你諗可以調咩。
        </p>
      </div>

      <div className="space-y-2.5">
        <input
          value={preference}
          onChange={(e) => setPreference(e.target.value)}
          placeholder="想要嘅風格（例如：清爽、唔太甜、有氣）"
          className="field w-full px-4 py-2.5"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={oneClickMenu}
            disabled={busy}
            className="btn-gold rounded-xl px-5 py-2.5 disabled:opacity-60"
          >
            {oneClick ? "🍸 生成緊全酒單…" : "🍸 一鍵生成全酒單"}
          </button>
          <button
            onClick={generate}
            disabled={busy}
            className="btn-ghost rounded-xl px-5 py-2.5 disabled:opacity-60"
          >
            {loading ? "諗緊…" : "✨ 只睇配方"}
          </button>
        </div>
        <p className="text-xs text-muted-2">
          「一鍵生成全酒單」會直接幫你整成幾杯加落酒單；「只睇配方」就俾你揀邊杯先加。
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </p>
      )}

      {notice && (
        <p className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
          {notice}
        </p>
      )}

      {busy && (
        <p className="text-center text-muted">AI 調酒師思考緊…🍸</p>
      )}

      {recipes.length > 0 && remainingCount > 0 && (
        <button
          onClick={addAll}
          disabled={busy}
          className="btn-gold w-full rounded-xl px-5 py-2.5 disabled:opacity-60"
        >
          {addingAll ? "加入緊…" : `＋ 全部加入酒單（${remainingCount} 杯）`}
        </button>
      )}

      <ul className="space-y-4">
        {recipes.map((r) => (
          <li key={r.name} className="card animate-fade-up p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{r.name}</h3>
                <p className="mt-0.5 text-sm text-muted">{r.description}</p>
              </div>
              <button
                onClick={() => addToMenu(r)}
                disabled={added[r.name] || busy}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold disabled:opacity-60 ${
                  added[r.name] ? "btn-ghost" : "btn-gold"
                }`}
              >
                {added[r.name] ? "已加入 ✓" : "加入酒單"}
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
                  材料
                </h4>
                <ul className="space-y-0.5 text-sm">
                  {r.ingredients.map((i, idx) => (
                    <li key={idx}>· {i}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1 text-xs uppercase tracking-wide text-muted">
                  做法
                </h4>
                <ol className="space-y-0.5 text-sm">
                  {r.steps.map((s, idx) => (
                    <li key={idx}>
                      {idx + 1}. {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
