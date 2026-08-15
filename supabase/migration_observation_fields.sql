-- Structured 7-field observation note (А-Ё), replacing the single free-text
-- note with a full СӨБ-aligned observation record. `note` (Г. Ажиглалтын
-- тэмдэглэл) is kept as-is; six new fields are added alongside it.

alter table public.observations
  add column if not exists observed_fact text,           -- А. Ажиглагдсан баримт
  add column if not exists development_direction text,   -- Б. Хөгжлийн чиглэл
  add column if not exists child_performance text,        -- В. Хүүхдийн гүйцэтгэл
  add column if not exists teacher_conclusion text,        -- Д. Багшийн дүгнэлт
  add column if not exists next_action text,                -- Е. Цаашдын үйл ажиллагаа
  add column if not exists methodology_note text;             -- Ё. Арга зүйн санал
