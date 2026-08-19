create table if not exists public.garaa_summaries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (group_id)
);

create index if not exists garaa_summaries_teacher_idx on public.garaa_summaries (teacher_id);

alter table public.garaa_summaries enable row level security;

create policy "garaa_summaries_all_own" on public.garaa_summaries
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

create table if not exists public.outcome_summaries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (group_id)
);

create index if not exists outcome_summaries_teacher_idx on public.outcome_summaries (teacher_id);

alter table public.outcome_summaries enable row level security;

create policy "outcome_summaries_all_own" on public.outcome_summaries
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
