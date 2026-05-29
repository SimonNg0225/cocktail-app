-- Guest-facing tags + ingredients on drinks.
-- tags: style chips (mocktail/strong/refreshing/sweet/sour/sparkling)
-- ingredients: shown to guests so they know what's inside.
alter table public.drinks
  add column if not exists tags        text[] not null default '{}',
  add column if not exists ingredients text[] not null default '{}';
