-- =====================================================================
-- Нэмэлт: Биеийн тамирын сорил (Хурд, Хүч, Авхаалж самбаа, Тэнцвэр)
-- Ажиллуулах: Supabase Dashboard -> SQL Editor -> New query -> энэ файлыг
-- бүхлээр нь paste хийж Run дарна (schema.sql-ыг аль хэдийн ажиллуулсан
-- бол зөвхөн энэ файлыг нэмж ажиллуулахад хангалттай)
-- =====================================================================

create table if not exists public.fitness_tests (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  tested_on date not null default current_date,
  age_group smallint not null check (age_group in (3, 4, 5)),
  gender text not null check (gender in ('эрэгтэй', 'эмэгтэй')),
  speed_sec numeric,
  speed_score smallint check (speed_score between 1 and 3),
  strength_value numeric,
  strength_score smallint check (strength_score between 1 and 3),
  agility_value numeric,
  agility_score smallint check (agility_score between 1 and 3),
  balance_sec numeric,
  balance_score smallint check (balance_score between 1 and 3),
  total_score smallint,
  level text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists fitness_tests_child_idx on public.fitness_tests (child_id);
create index if not exists fitness_tests_teacher_idx on public.fitness_tests (teacher_id);
create index if not exists fitness_tests_tested_on_idx on public.fitness_tests (tested_on);

alter table public.fitness_tests enable row level security;

create policy "fitness_tests_all_own" on public.fitness_tests
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
