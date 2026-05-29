-- Strength + serving hints on drinks.
-- abv:       approximate alcohol % (0 = mocktail). Nullable; shown as a strength meter.
-- volume_ml: approximate serving size in ml. Nullable.
alter table public.drinks
  add column if not exists abv       numeric,
  add column if not exists volume_ml integer;
