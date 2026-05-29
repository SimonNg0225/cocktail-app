// Per-device drink "passport" — every glass a guest actually finishes (their
// order reaches `served`) becomes a collectible stamp. Stored in localStorage
// today; designed so it can later sync to a real account (Taste Passport).
export type CollEntry = { n: number; first: string; last: string; name: string };
type CollData = { drinks: Record<string, CollEntry>; orders: string[] };

const KEY = "collection";

function read(): CollData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d === "object") {
        return { drinks: d.drinks ?? {}, orders: d.orders ?? [] };
      }
    }
  } catch {
    // ignore corrupt storage
  }
  return { drinks: {}, orders: [] };
}

function write(d: CollData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    // ignore quota / private-mode
  }
}

export type ServedItem = {
  drink_id: string | null;
  drink_name: string;
  quantity: number;
};

// Idempotent per order. Returns the drink ids newly unlocked (0 → 1+) so the
// caller can celebrate. Re-processing the same order is a no-op.
export function recordServedOrder(orderId: string, items: ServedItem[]): string[] {
  const d = read();
  if (d.orders.includes(orderId)) return [];
  const now = new Date().toISOString();
  const newly: string[] = [];
  for (const it of items) {
    if (!it.drink_id) continue;
    const cur = d.drinks[it.drink_id];
    if (!cur) {
      d.drinks[it.drink_id] = {
        n: it.quantity,
        first: now,
        last: now,
        name: it.drink_name,
      };
      newly.push(it.drink_id);
    } else {
      cur.n += it.quantity;
      cur.last = now;
      cur.name = it.drink_name;
    }
  }
  d.orders.push(orderId);
  write(d);
  return newly;
}

export function getCollection(): Record<string, CollEntry> {
  return read().drinks;
}
