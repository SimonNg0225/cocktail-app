"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Order, OrderItem, OrderStatus as Status } from "@/lib/types";
import Confetti from "@/components/Confetti";
import Ambient from "@/components/Ambient";

const STEPS: { key: Status; label: string; icon: string }[] = [
  { key: "pending", label: "已收到", icon: "📝" },
  { key: "making", label: "調緊", icon: "🍸" },
  { key: "served", label: "請享用", icon: "✨" },
];

const STATUS_TEXT: Record<Status, string> = {
  pending: "調酒師已收到你張單",
  making: "調酒師調緊你杯嘢 🍹",
  served: "整好喇，去攞返杯嘢啦！",
  cancelled: "呢張單已取消",
};

export default function OrderStatus({ orderId }: { orderId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", orderId)
        .maybeSingle();
      if (!active) return;
      if (!data) {
        setNotFound(true);
      } else {
        const o = data as Order;
        setOrder(o);
        setItems(o.order_items ?? []);
      }
      setLoading(false);
    })();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => setOrder((prev) => ({ ...(prev as Order), ...(payload.new as Order) })),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, orderId]);

  if (loading)
    return (
      <div className="mx-auto max-w-xl px-4 pt-24 text-center">
        <div className="shimmer mx-auto h-6 w-40 rounded" />
      </div>
    );

  if (notFound || !order)
    return (
      <div className="mx-auto max-w-xl px-4 pt-24 text-center animate-fade-in">
        <div className="text-4xl">🤔</div>
        <p className="mt-3 text-muted">搵唔到呢張單。</p>
        <Link href="/" className="mt-4 inline-block text-accent underline">
          返去酒單
        </Link>
      </div>
    );

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const cancelled = order.status === "cancelled";
  const served = order.status === "served";

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-12">
      <Ambient />
      <Confetti show={served} />
      <header className="text-center animate-fade-up">
        <p className="text-xs uppercase tracking-[0.4em] text-accent">訂單狀態</p>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          {order.guest_name}
          {served ? " 🥂" : cancelled ? " 😕" : "，多謝你！"}
        </h1>
        <p className="mt-2 text-muted">{STATUS_TEXT[order.status]}</p>
      </header>

      {!cancelled && (
        <div className="mt-9 flex justify-center animate-fade-in">
          <div
            className={`relative flex h-28 w-28 items-center justify-center rounded-full border bg-surface ${
              served ? "border-success/40" : "border-accent/30"
            } ${order.status === "making" ? "animate-glow" : ""}`}
          >
            {order.status === "making" && (
              <>
                <span className="animate-steam absolute -top-1 left-1/2 h-6 w-1 -translate-x-1/2 rounded-full bg-foreground/30 blur-[2px]" />
                <span
                  className="animate-steam absolute -top-1 left-[40%] h-5 w-1 rounded-full bg-foreground/20 blur-[2px]"
                  style={{ animationDelay: "0.7s" }}
                />
                <span
                  className="animate-steam absolute -top-1 left-[60%] h-5 w-1 rounded-full bg-foreground/20 blur-[2px]"
                  style={{ animationDelay: "1.3s" }}
                />
              </>
            )}
            <span key={order.status} className="animate-pop text-5xl">
              {served ? "🥂" : (STEPS[currentIdx]?.icon ?? "🍸")}
            </span>
          </div>
        </div>
      )}

      {!cancelled && (
        <div className="mt-8 flex items-start justify-between px-2 animate-fade-in">
          {STEPS.map((s, i) => {
            const done = i <= currentIdx;
            const isCurrent = i === currentIdx;
            return (
              <div key={s.key} className="relative flex flex-1 flex-col items-center">
                {i > 0 && (
                  <span
                    className={`absolute right-1/2 top-6 h-0.5 w-full -translate-y-1/2 ${
                      i <= currentIdx ? "bg-accent" : "bg-border"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full text-lg transition ${
                    done
                      ? "btn-gold"
                      : "border border-border bg-surface text-muted-2"
                  } ${isCurrent && !served ? "ring-4 ring-accent/20" : ""}`}
                >
                  {s.icon}
                </div>
                <span
                  className={`mt-2.5 text-xs ${done ? "text-foreground" : "text-muted-2"}`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="card mt-9 p-5 animate-fade-up">
        <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted">你嘅單</h2>
        <ul className="space-y-2.5">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between">
              <span>{it.drink_name}</span>
              <span className="text-muted tabular-nums">× {it.quantity}</span>
            </li>
          ))}
        </ul>
        {order.note && (
          <p className="mt-4 hairline pt-3 text-sm text-muted">📝 {order.note}</p>
        )}
      </div>

      <Link
        href="/"
        className="btn-ghost mt-6 block rounded-2xl py-3.5 text-center font-medium"
      >
        + 再落多杯
      </Link>
    </div>
  );
}
