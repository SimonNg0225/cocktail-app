"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Drink } from "@/lib/types";

type Proposal = {
  id: string;
  name: string;
  before: string[];
  after: string[];
  recipe: string;
  include: boolean;
};

// An ingredient is treated as "missing an amount" when it carries no number and
// isn't an obviously qualitative pour (適量/少許/填滿).
function lacksAmount(s: string) {
  if (/[0-9]/.test(s)) return false;
  if (/(適量|少許|填滿|to top|splash)/i.test(s)) return false;
  return true;
}

export default function AmendAmounts() {
  const [scanning, setScanning] = useState(false);
  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [candidates, setCandidates] = useState<Drink[] | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function scan() {
    setScanning(true);
    setError(null);
    setNotice(null);
    setProposals([]);
    const supabase = createClient();
    const { data } = await supabase
      .from("drinks")
      .select("*")
      .order("created_at", { ascending: true });
    const all = (data as Drink[]) ?? [];
    const cands = all.filter((d) => {
      const ing = d.ingredients ?? [];
      return ing.length > 0 && ing.some(lacksAmount);
    });
    setCandidates(cands);
    setScanning(false);
  }

  async function amendAll() {
    if (!candidates || candidates.length === 0) return;
    setWorking(true);
    setError(null);
    setProposals([]);
    setProgress({ done: 0, total: candidates.length });
    const out: Proposal[] = [];
    for (const d of candidates) {
      try {
        const res = await fetch("/api/recipes/amend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: d.name,
            description: d.description,
            ingredients: d.ingredients ?? [],
            recipe: d.recipe,
          }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.ingredients)) {
          out.push({
            id: d.id,
            name: d.name,
            before: d.ingredients ?? [],
            after: data.ingredients,
            recipe: data.recipe ?? "",
            include: true,
          });
        }
      } catch {
        // skip this one on network hiccup
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    setProposals(out);
    setWorking(false);
    if (out.length === 0) setError("補唔到，請再試。");
  }

  async function save() {
    const picked = proposals.filter((p) => p.include);
    if (picked.length === 0) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    let ok = 0;
    for (const p of picked) {
      const { error: e } = await supabase
        .from("drinks")
        .update({ ingredients: p.after, recipe: p.recipe })
        .eq("id", p.id);
      if (!e) ok++;
    }
    setSaving(false);
    setProposals([]);
    setNotice(`已補回 ${ok} 杯酒嘅份量 🥃`);
    scan(); // refresh remaining
  }

  return (
    <div className="card mt-6 space-y-3 p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">✨ 一鍵補回份量</h2>
        <p className="text-sm text-muted">
          搵出冇份量嘅舊配方，叫 AI 補返每種材料嘅份量，預覽確認先至存。
        </p>
      </div>

      {notice && <p className="text-sm text-success">{notice}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}

      {candidates === null ? (
        <button
          onClick={scan}
          disabled={scanning}
          className="btn-ghost rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"
        >
          {scanning ? "掃描緊…" : "掃描冇份量嘅酒"}
        </button>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted">👍 所有酒嘅材料都有份量，唔使補。</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted">
            搵到 <span className="text-accent">{candidates.length}</span> 杯酒缺份量。
          </p>
          {proposals.length === 0 && (
            <button
              onClick={amendAll}
              disabled={working}
              className="btn-gold rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"
            >
              {working
                ? `補緊… ${progress.done}/${progress.total}`
                : `✨ 幫呢 ${candidates.length} 杯補份量`}
            </button>
          )}
        </div>
      )}

      {proposals.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted">預覽（剔選要儲存嘅）：</p>
          <ul className="space-y-2">
            {proposals.map((p) => (
              <li key={p.id} className="rounded-xl bg-surface-2 p-3 text-sm">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={p.include}
                    onChange={(e) =>
                      setProposals((cur) =>
                        cur.map((x) =>
                          x.id === p.id ? { ...x, include: e.target.checked } : x,
                        ),
                      )
                    }
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="mt-1 text-xs text-muted-2 line-through">
                      {p.before.join("、")}
                    </p>
                    <p className="mt-0.5 text-xs text-accent">
                      {p.after.join("、")}
                    </p>
                  </div>
                </label>
              </li>
            ))}
          </ul>
          <button
            onClick={save}
            disabled={saving || proposals.every((p) => !p.include)}
            className="btn-gold w-full rounded-xl px-5 py-3 text-sm disabled:opacity-60"
          >
            {saving
              ? "儲存緊…"
              : `儲存所選（${proposals.filter((p) => p.include).length}）`}
          </button>
        </div>
      )}
    </div>
  );
}
