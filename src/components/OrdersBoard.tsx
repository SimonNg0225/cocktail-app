"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus, Drink } from "@/lib/types";

const NEXT_ACTION: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "making", label: "開始調" },
  making: { to: "served", label: "已上枱" },
};

const STATUS_BADGE: Record<OrderStatus, string> = {
  pending: "bg-amber-500/20 text-amber-300",
  making: "bg-blue-500/20 text-blue-300",
  served: "bg-green-500/20 text-green-300",
  cancelled: "bg-zinc-500/20 text-zinc-400",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待處理",
  making: "調緊",
  served: "已上",
  cancelled: "已取消",
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "啱啱";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  return `${h} 小時前`;
}

export default function OrdersBoard() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drinksById, setDrinksById] = useState<Record<string, Drink>>({});
  const [loading, setLoading] = useState(true);
  const [alertsOn, setAlertsOn] = useState(false);
  const [notifBlocked, setNotifBlocked] = useState(false);
  const alertsOnRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function ensureAudio() {
    if (!audioCtxRef.current) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) audioCtxRef.current = new Ctor();
    }
    audioCtxRef.current?.resume().catch(() => {});
    return audioCtxRef.current;
  }

  // Two-note chime synthesized on the fly — no audio asset needed.
  function playDing() {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.16;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  }

  function notifyNewOrder(guestName?: string) {
    if (!alertsOnRef.current) return;
    playDing();
    if ("vibrate" in navigator) navigator.vibrate([200, 90, 200]);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("🍸 有新單!", {
          body: guestName ? `${guestName} 落咗單` : "有客人落單",
          tag: "cocktail-order",
          icon: "/icons/icon-192.png",
        });
      } catch {}
    }
  }

  async function enableAlerts() {
    playDing(); // test chime, also unlocks audio within this user gesture
    if (typeof Notification !== "undefined") {
      const perm =
        Notification.permission === "default"
          ? await Notification.requestPermission()
          : Notification.permission;
      setNotifBlocked(perm === "denied");
    }
    if ("vibrate" in navigator) navigator.vibrate(60);
    setAlertsOn(true);
    alertsOnRef.current = true;
    localStorage.setItem("ordersAlerts", "on");
  }

  function disableAlerts() {
    setAlertsOn(false);
    alertsOnRef.current = false;
    localStorage.setItem("ordersAlerts", "off");
  }

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (localStorage.getItem("ordersAlerts") === "on") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAlertsOn(true);
      alertsOnRef.current = true;
      if (typeof Notification !== "undefined") {
        setNotifBlocked(Notification.permission === "denied");
      }
    }
    load();
    // Recipes for the bartender — fetched once (rarely change).
    supabase
      .from("drinks")
      .select("id, name, recipe, ingredients")
      .then(({ data }) => {
        const map: Record<string, Drink> = {};
        for (const d of (data as Drink[]) ?? []) map[d.id] = d;
        setDrinksById(map);
      });
    const channel = supabase
      .channel("orders-board")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) =>
          notifyNewOrder((payload.new as { guest_name?: string })?.guest_name),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "order_items" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function setStatus(id: string, status: OrderStatus) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o)),
    );
    await supabase.from("orders").update({ status }).eq("id", id);
  }

  const columns = [
    {
      key: "pending",
      label: "待處理",
      emoji: "📝",
      empty: "暫時冇新單，輕鬆下 🍸",
      orders: orders.filter((o) => o.status === "pending"),
    },
    {
      key: "making",
      label: "調緊",
      emoji: "🍸",
      empty: "未開始調任何一杯",
      orders: orders.filter((o) => o.status === "making"),
    },
    {
      key: "done",
      label: "完成",
      emoji: "✨",
      empty: "仲未有完成嘅單",
      orders: orders.filter(
        (o) => o.status === "served" || o.status === "cancelled",
      ),
    },
  ];

  // Live party dashboard: order count, glasses served, crowd favourite.
  const stats = useMemo(() => {
    const tally: Record<string, number> = {};
    let glasses = 0;
    for (const o of orders) {
      for (const it of o.order_items ?? []) {
        tally[it.drink_name] = (tally[it.drink_name] ?? 0) + it.quantity;
        if (o.status === "served") glasses += it.quantity;
      }
    }
    let topName = "";
    let topQty = 0;
    for (const [n, q] of Object.entries(tally)) {
      if (q > topQty) {
        topQty = q;
        topName = n;
      }
    }
    return { total: orders.length, glasses, topName };
  }, [orders]);

  if (loading)
    return (
      <ul className="space-y-3">
        {[0, 1].map((i) => (
          <li key={i} className="card space-y-3 p-4">
            <div className="shimmer h-5 w-1/3 rounded" />
            <div className="shimmer h-3 w-2/3 rounded" />
          </li>
        ))}
      </ul>
    );

  return (
    <div className="space-y-6">
      {orders.length > 0 && (
        <div className="card flex items-center justify-around gap-2 p-4 text-center animate-fade-up">
          <div className="min-w-0">
            <p className="font-display text-2xl font-semibold text-gradient-gold">
              {stats.total}
            </p>
            <p className="text-[0.7rem] text-muted-2">總單數</p>
          </div>
          <div className="h-9 w-px shrink-0 bg-border-soft" />
          <div className="min-w-0">
            <p className="font-display text-2xl font-semibold text-gradient-gold">
              {stats.glasses}
            </p>
            <p className="text-[0.7rem] text-muted-2">已上杯數</p>
          </div>
          <div className="h-9 w-px shrink-0 bg-border-soft" />
          <div className="min-w-0 max-w-[42%]">
            <p className="truncate font-display text-lg font-semibold">
              {stats.topName || "—"}
            </p>
            <p className="text-[0.7rem] text-muted-2">🔥 最受歡迎</p>
          </div>
        </div>
      )}

      <div className="card flex items-center justify-between gap-3 p-3.5">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {alertsOn ? "🔔 新單提醒：開咗" : "🔕 新單提醒：未開"}
          </p>
          <p className="mt-0.5 text-xs text-muted-2">
            {notifBlocked
              ? "桌面通知俾瀏覽器封咗，但仲會響聲同震。"
              : "開咗之後，一有新單即刻響聲、震、彈通知，唔使盯住個 mon。"}
          </p>
        </div>
        <button
          onClick={alertsOn ? disableAlerts : enableAlerts}
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            alertsOn ? "bg-success/15 text-success" : "btn-gold"
          }`}
        >
          {alertsOn ? "關閉" : "開啟提醒"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 md:items-start">
        {columns.map((col) => (
          <section key={col.key}>
            <h2 className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
              <span aria-hidden>{col.emoji}</span>
              {col.label}
              <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[0.7rem] tabular-nums text-muted-2">
                {col.orders.length}
              </span>
            </h2>
            {col.orders.length === 0 ? (
              <div className="card p-6 text-center text-sm text-muted-2">
                {col.empty}
              </div>
            ) : (
              <ul className="space-y-3 md:max-h-[calc(100vh-18rem)] md:overflow-y-auto md:pr-1">
                {col.orders.map((o) => (
                  <OrderCard key={o.id} order={o} onStatus={setStatus} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );

  function OrderCard({
    order,
    onStatus,
  }: {
    order: Order;
    onStatus: (id: string, s: OrderStatus) => void;
  }) {
    const next = NEXT_ACTION[order.status];
    return (
      <li className="card animate-fade-up p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-semibold">{order.guest_name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${STATUS_BADGE[order.status]}`}
              >
                {STATUS_LABEL[order.status]}
              </span>
            </div>
            <p className="text-xs text-muted">{timeAgo(order.created_at)}</p>
          </div>
        </div>

        <ul className="mt-3 space-y-2.5 text-sm">
          {(order.order_items ?? []).map((it) => {
            const drink = it.drink_id ? drinksById[it.drink_id] : undefined;
            const ingredients = drink?.ingredients ?? [];
            const recipe = (drink?.recipe ?? "").trim();
            return (
              <li key={it.id}>
                <div className="flex justify-between gap-2">
                  <span className="min-w-0 font-medium">
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
                </div>
                {(recipe || ingredients.length > 0) && (
                  <div className="mt-1.5 rounded-lg bg-surface-2/70 px-2.5 py-2 text-xs leading-relaxed text-foreground/90">
                    {recipe ? (
                      <p className="whitespace-pre-wrap">{recipe}</p>
                    ) : (
                      <p>🧪 材料：{ingredients.join("、")}</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {order.note && (
          <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">
            📝 {order.note}
          </p>
        )}

        {(order.status === "pending" || order.status === "making") && (
          <div className="mt-3 flex gap-2">
            {next && (
              <button
                onClick={() => onStatus(order.id, next.to)}
                className="btn-gold flex-1 rounded-xl px-4 py-2.5 text-sm"
              >
                {next.label}
              </button>
            )}
            <button
              onClick={() => onStatus(order.id, "cancelled")}
              className="btn-ghost rounded-xl px-4 py-2.5 text-sm"
            >
              取消
            </button>
          </div>
        )}
      </li>
    );
  }
}
