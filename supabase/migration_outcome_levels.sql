-- =====================================================================
-- Нэмэлт: СҮД болон бүлэгт "түвшин" (1-4) нэмэх
-- 1 = Бага бүлэг 2нас, 2 = Дунд бүлэг 3нас, 3 = Ахлах бүлэг 4нас,
-- 4 = Бэлтгэл бүлэг 5нас
-- Ажиллуулах: Supabase Dashboard -> SQL Editor -> New query -> энэ файлыг
-- бүхлээр нь paste хийж Run дарна
-- =====================================================================

alter table public.learning_outcomes
  add column if not exists level smallint check (level between 1 and 4);

create index if not exists learning_outcomes_level_idx on public.learning_outcomes (level);

alter table public.groups
  add column if not exists level smallint check (level between 1 and 4);
