create table if not exists public.fitness_overall_summaries (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (teacher_id)
);

alter table public.fitness_overall_summaries enable row level security;

create policy "fitness_overall_summaries_all_own" on public.fitness_overall_summaries
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);
