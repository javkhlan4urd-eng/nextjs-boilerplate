-- =====================================================================
-- Нэмэлт: Суралцахуйн үр дүн (СҮД) — чиглэл тус бүрийн нарийвчилсан
-- шалгуур, тэдгээрт үндэслэсэн ажиглалт, автомат дүгнэлт
-- Ажиллуулах: Supabase Dashboard -> SQL Editor -> New query -> энэ файлыг
-- бүхлээр нь paste хийж Run дарна
-- =====================================================================

create table if not exists public.learning_outcomes (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.learning_domains (id) on delete cascade,
  code text not null,
  description text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists learning_outcomes_domain_idx on public.learning_outcomes (domain_id);

alter table public.learning_outcomes enable row level security;

create policy "learning_outcomes_all_own" on public.learning_outcomes
  for all using (
    exists (
      select 1 from public.learning_domains d
      where d.id = learning_outcomes.domain_id and d.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.learning_domains d
      where d.id = learning_outcomes.domain_id and d.teacher_id = auth.uid()
    )
  );

alter table public.observations
  add column if not exists outcome_id uuid references public.learning_outcomes (id) on delete set null;

create index if not exists observations_outcome_idx on public.observations (outcome_id);

create table if not exists public.outcome_conclusions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  outcome_id uuid not null references public.learning_outcomes (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  conclusion text not null,
  observation_count int not null,
  generated_at timestamptz not null default now(),
  unique (child_id, outcome_id)
);

create index if not exists outcome_conclusions_child_idx on public.outcome_conclusions (child_id);
create index if not exists outcome_conclusions_teacher_idx on public.outcome_conclusions (teacher_id);

alter table public.outcome_conclusions enable row level security;

create policy "outcome_conclusions_all_own" on public.outcome_conclusions
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
