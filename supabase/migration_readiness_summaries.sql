create table if not exists public.readiness_summaries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (group_id)
);

create index if not exists readiness_summaries_teacher_idx on public.readiness_summaries (teacher_id);

alter table public.readiness_summaries enable row level security;

create policy "readiness_summaries_all_own" on public.readiness_summaries
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
