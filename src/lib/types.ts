export type IngredientCategory =
  | "spirit"
  | "liqueur"
  | "bitters"
  | "mixer"
  | "garnish"
  | "other";

export type OrderStatus = "pending" | "making" | "served" | "cancelled";

export type Inventory = {
  id: string;
  name: string;
  category: IngredientCategory;
  in_stock: boolean;
  created_at: string;
};

export type Drink = {
  id: string;
  name: string;
  description: string | null;
  recipe: string | null;
  image_url: string | null;
  is_available: boolean;
  source: "manual" | "ai";
  // Added 2026-05-29 (migration 20260529153000). Optional so reads stay safe
  // before the migration runs; always access with `?? []`.
  tags?: string[];
  ingredients?: string[];
  // Added 2026-05-29 (migration 20260529160000). Nullable strength/serving hints.
  abv?: number | null;
  volume_ml?: number | null;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  drink_id: string | null;
  drink_name: string;
  quantity: number;
  note: string | null;
};

export type Order = {
  id: string;
  guest_name: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  order_items?: OrderItem[];
};
