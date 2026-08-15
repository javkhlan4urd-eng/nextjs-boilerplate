-- Cross-domain СҮД linkage ("Сургалтын хөтөлбөрийн уялдаа"): the official
-- curriculum documents note, for each activity group, which СҮД in OTHER
-- domains that same activity also touches. This table stores that mapping
-- so a teacher writing an observation for one СҮД can see related СҮД
-- across other domains.

create table if not exists public.outcome_correlations (
  id uuid primary key default gen_random_uuid(),
  outcome_id uuid not null references public.learning_outcomes (id) on delete cascade,
  related_outcome_id uuid not null references public.learning_outcomes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (outcome_id, related_outcome_id)
);

create index if not exists outcome_correlations_outcome_idx on public.outcome_correlations (outcome_id);

alter table public.outcome_correlations enable row level security;

create policy "outcome_correlations_all_own" on public.outcome_correlations
  for all using (
    exists (
      select 1 from public.learning_outcomes o
      join public.learning_domains d on d.id = o.domain_id
      where o.id = outcome_correlations.outcome_id and d.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.learning_outcomes o
      join public.learning_domains d on d.id = o.domain_id
      where o.id = outcome_correlations.outcome_id and d.teacher_id = auth.uid()
    )
  );
