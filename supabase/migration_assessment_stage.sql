-- =====================================================================
-- Нэмэлт: Үнэлгээ (Гарааны / Явцын / Үр дүнгийн)
-- Ажиллуулах: Supabase Dashboard -> SQL Editor -> New query -> энэ файлыг
-- бүхлээр нь paste хийж Run дарна
-- =====================================================================

alter table public.observations
  add column if not exists stage text check (stage in ('garaa', 'yavts'));

create index if not exists observations_stage_idx on public.observations (stage);
