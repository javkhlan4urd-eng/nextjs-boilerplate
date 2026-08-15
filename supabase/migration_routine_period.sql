alter table public.observations
  add column if not exists routine_period text;
