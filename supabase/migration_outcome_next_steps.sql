-- =====================================================================
-- Нэмэлт: СҮД дүгнэлтэд "Цаашид" (дараагийн алхам) талбар нэмэх
-- Ажиллуулах: Supabase Dashboard -> SQL Editor -> New query -> энэ файлыг
-- бүхлээр нь paste хийж Run дарна
-- =====================================================================

alter table public.outcome_conclusions
  add column if not exists next_steps text;
