-- Observations no longer require a per-note level when part of a СҮД
-- outcome workspace; the final assessed level now lives on the
-- outcome_conclusions row instead (set once, alongside the AI/teacher
-- conclusion and next steps).

alter table public.observations
  alter column level drop not null;

alter table public.outcome_conclusions
  add column if not exists level smallint check (level between 1 and 4);
