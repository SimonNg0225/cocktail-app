"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/types";
import Ambient from "@/components/Ambient";
import { haptic } from "@/lib/haptics";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待處理",
  making: "調緊",
  served: "已享用",
  cancelled: "已取消",
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  making: "bg-blue-500/20 text-blue-300",
  served: "bg-green-500/20 text-green-300",
  cancelled: "bg-zinc-500/20 text-zinc-400",
};

function when(iso: string) {
  return new Date(iso).toLocaleString("zh-HK", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// This device's own past orders (ids live in localStorage — guests have no
// login). Lets a guest re-check status or re-fire the same round in one tap.
export default function OrderHistory() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let ids: string[] = [];
    try {
      const raw = JSON.parse(localStorage.getItem("myOrders") ?? "[]");
      if (Array.isArray(raw)) ids = raw.filter((x) => typeof x === "string");
    } catch {
      // ignore corrupt storage
    }
    if (ids.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .in("id", ids);
      if (!active) return;
      const list = (data as Order[]) ?? [];
      // Preserve the localStorage order (most recent first).
      const pos = new Map(ids.map((id, i) => [id, i]));
      list.sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999));
      setOrders(list);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  function reorder(o: Order) {
    haptic("medium");
    const cart: Record<string, number> = {};
    for (const it of o.order_items ?? []) {
      if (it.drink_id) cart[it.drink_id] = (cart[it.drink_id] ?? 0) + it.quantity;
    }
    try {
      localStorage.setItem("reorderCart", JSON.stringify(cart));
    } catch {
      // ignore
    }
    router.push("/");
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-10">
      <Ambient />
      <header className="mb-7 text-center animate-fade-up">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">點單紀錄</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-gradient-gold-anim">
          🧾 我的單
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
          呢部機落過嘅單，可以隨時翻睇或者再嚟一次。
        </p>
        <Link
          href="/"
          className="btn-ghost mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm"
        >
          ← 返去酒單
        </Link>
      </header>

      {loading && (
        <ul className="space-y-3">
          {[0, 1].map((i) => (
            <li key={i} className="card space-y-3 p-4">
              <div className="shimmer h-5 w-1/3 rounded" />
              <div className="shimmer h-3 w-2/3 rounded" />
            </li>
          ))}
        </ul>
      )}

      {!loading && orders.length === 0 && (
        <div className="card p-10 text-center animate-fade-in">
          <div className="text-5xl">🍸</div>
          <p className="mt-4 text-muted">呢部機仲未落過單。</p>
          <Link
            href="/"
            className="btn-gold mt-5 inline-flex rounded-full px-5 py-2.5 text-sm"
          >
            睇酒單落單 →
          </Link>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((o, i) => {
            const items = o.order_items ?? [];
            return (
              <li
                key={o.id}
                className="card animate-fade-up p-4"
                style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg font-semibold">
                        {o.guest_name}
                      </h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[o.status]}`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                    </div>
                    <p className="text-xs text-muted">{when(o.created_at)}</p>
                  </div>
                </div>

                <ul className="mt-3 space-y-1.5 text-sm">
                  {items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span className="min-w-0">
                        {it.drink_name}
                        {it.note && (
                          <span className="mt-0.5 block text-xs font-medium text-accent">
                            📝 {it.note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-muted tabular-nums">
                        × {it.quantity}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/order/${o.id}`}
                    className="btn-ghost flex-1 rounded-xl px-4 py-2 text-center text-sm"
                  >
                    睇狀態
                  </Link>
                  <button
                    onClick={() => reorder(o)}
                    className="btn-gold flex-1 rounded-xl px-4 py-2 text-sm"
                  >
                    🔁 再嚟一次
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
