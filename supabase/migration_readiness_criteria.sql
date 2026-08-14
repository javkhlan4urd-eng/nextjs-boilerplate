-- =====================================================================
-- Нэмэлт: Үр дүнгийн үнэлгээ — "Суралцагчийн хөгжлийн үнэлгээний шалгуур"
-- (Мэдлэг/Чадвар/Төлөвшил, түвшин 1-4) дээр үндэслэсэн шалгах хуудас
-- Ажиллуулах: Supabase Dashboard -> SQL Editor -> New query -> энэ файлыг
-- бүхлээр нь paste хийж Run дарна
-- =====================================================================

create table if not exists public.readiness_criteria (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  level smallint not null check (level between 1 and 4),
  category text not null check (category in ('Мэдлэг', 'Чадвар', 'Төлөвшил')),
  number int not null,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists readiness_criteria_teacher_idx on public.readiness_criteria (teacher_id);
create index if not exists readiness_criteria_level_idx on public.readiness_criteria (level);

alter table public.readiness_criteria enable row level security;

create policy "readiness_criteria_all_own" on public.readiness_criteria
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

create table if not exists public.readiness_checks (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  criterion_id uuid not null references public.readiness_criteria (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  achieved boolean not null default false,
  checked_on date not null default current_date,
  updated_at timestamptz not null default now(),
  unique (child_id, criterion_id)
);

create index if not exists readiness_checks_child_idx on public.readiness_checks (child_id);
create index if not exists readiness_checks_teacher_idx on public.readiness_checks (teacher_id);

alter table public.readiness_checks enable row level security;

create policy "readiness_checks_all_own" on public.readiness_checks
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
