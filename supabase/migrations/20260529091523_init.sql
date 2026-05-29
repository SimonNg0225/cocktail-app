-- Home cocktail bar schema
-- Roles:
--   anon (guests, no login): read available drinks, create orders, read order status
--   authenticated (host): full control over everything

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.inventory (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  category   text not null default 'spirit', -- spirit | liqueur | bitters | mixer | garnish | other
  in_stock   boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.drinks (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  recipe       text,                 -- optional preparation notes
  image_url    text,
  is_available boolean not null default true,
  source       text not null default 'manual', -- manual | ai
  created_at   timestamptz not null default now()
);

create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  guest_name text not null,
  status     text not null default 'pending', -- pending | making | served | cancelled
  note       text,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  drink_id   uuid references public.drinks(id) on delete set null,
  drink_name text not null,          -- snapshot so deleted drinks still render
  quantity   int  not null default 1 check (quantity > 0),
  note       text
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.inventory   enable row level security;
alter table public.drinks      enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- inventory: host only
create policy "inventory_host_all" on public.inventory
  for all to authenticated using (true) with check (true);

-- drinks: guests read available; host full control
create policy "drinks_guest_read_available" on public.drinks
  for select to anon using (is_available = true);
create policy "drinks_host_all" on public.drinks
  for all to authenticated using (true) with check (true);

-- orders: guests create + read; host full control
create policy "orders_guest_insert" on public.orders
  for insert to anon with check (true);
create policy "orders_guest_read" on public.orders
  for select to anon using (true);
create policy "orders_host_all" on public.orders
  for all to authenticated using (true) with check (true);

-- order_items: guests create + read; host full control
create policy "order_items_guest_insert" on public.order_items
  for insert to anon with check (true);
create policy "order_items_guest_read" on public.order_items
  for select to anon using (true);
create policy "order_items_host_all" on public.order_items
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Realtime (host dashboard subscribes to live orders)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.order_items;
