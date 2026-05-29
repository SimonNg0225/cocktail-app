"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { IngredientCategory, Inventory } from "@/lib/types";

const CATEGORIES: { value: IngredientCategory; label: string }[] = [
  { value: "spirit", label: "基酒" },
  { value: "liqueur", label: "利口酒" },
  { value: "bitters", label: "苦精" },
  { value: "mixer", label: "Mixer" },
  { value: "garnish", label: "裝飾" },
  { value: "other", label: "其他" },
];

const CAT_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

export default function InventoryManager() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<IngredientCategory>("spirit");

  async function load() {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    setItems((data as Inventory[]) ?? []);
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
    const { data } = await supabase
      .from("inventory")
      .insert({ name: name.trim(), category })
      .select()
      .single();
    if (data) setItems((prev) => [...prev, data as Inventory]);
    setName("");
  }

  async function toggle(item: Inventory) {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, in_stock: !i.in_stock } : i)),
    );
    await supabase
      .from("inventory")
      .update({ in_stock: !item.in_stock })
      .eq("id", item.id);
  }

  async function remove(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from("inventory").delete().eq("id", id);
  }

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    list: items.filter((i) => i.category === c.value),
  })).filter((g) => g.list.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold">我有嘅酒同材料</h2>
        <p className="text-sm text-muted">
          輸入你有嘅嘢，AI 配方會根據呢度推薦。
        </p>
      </div>

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：Bombay Sapphire 氈酒"
          className="field min-w-0 flex-1 px-4 py-2.5"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as IngredientCategory)}
          className="field px-3 py-2.5"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-gold rounded-xl px-5 py-2.5">
          加入
        </button>
      </form>

      {loading ? (
        <p className="text-muted">載入緊…</p>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          仲未有材料，加入你第一支酒啦。
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) => (
            <section key={g.value}>
              <h3 className="mb-2 text-sm uppercase tracking-wide text-muted">
                {g.label}
              </h3>
              <ul className="space-y-2">
                {g.list.map((item) => (
                  <li
                    key={item.id}
                    className={`card flex items-center gap-3 px-4 py-2.5 ${
                      item.in_stock ? "" : "opacity-50"
                    }`}
                  >
                    <button
                      onClick={() => toggle(item)}
                      className="flex items-center gap-2"
                      title="切換有無貨"
                    >
                      <span
                        className={`h-3 w-3 rounded-full ${
                          item.in_stock ? "bg-green-400" : "bg-zinc-500"
                        }`}
                      />
                      <span className={item.in_stock ? "" : "line-through"}>
                        {item.name}
                      </span>
                    </button>
                    <span className="ml-auto text-xs text-muted">
                      {CAT_LABEL[item.category]}
                    </span>
                    <button
                      onClick={() => remove(item.id)}
                      className="text-muted hover:text-red-400"
                      title="刪除"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
