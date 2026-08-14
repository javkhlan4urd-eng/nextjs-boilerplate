-- =====================================================================
-- Цэцэрлэгийн хүүхдийн хөгжлийн ажиглалт-үнэлгээний систем
-- Supabase schema: tables, RLS policies, storage buckets, triggers, seed data
-- Ажиллуулах: Supabase Dashboard -> SQL Editor -> New query -> энэ файлыг бүхлээр нь paste хийж Run дарна
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES (багш)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- auth.users-д шинэ хэрэглэгч бүртгэгдэх бүрд profiles мөр болон стандарт 7 чиглэл
-- тухайн багшид зориулж автоматаар үүснэ (багш бүр өөрийн 7 чиглэлийг чөлөөтэй засах боломжтой)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  insert into public.learning_domains (teacher_id, name, sort_order)
  select new.id, name, sort_order
  from (values
    ('Бие бялдрын хөгжил', 1),
    ('Нийгэмшихүйн хөгжил', 2),
    ('Хэл ярианы хөгжил', 3),
    ('Танин мэдэхүйн хөгжил', 4),
    ('Тоо ба тооллын хөгжил', 5),
    ('Урлагийн хөгжил', 6),
    ('Ёс суртахуун-иргэний хөгжил', 7)
  ) as seed(name, sort_order);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. GROUPS (бүлэг)
-- ---------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  school_year text,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "groups_all_own" on public.groups
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- ---------------------------------------------------------------------
-- 3. CHILDREN (хүүхэд)
-- ---------------------------------------------------------------------
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  last_name text,
  first_name text not null,
  gender text check (gender in ('эрэгтэй', 'эмэгтэй')),
  birth_date date,
  photo_url text,
  father_name text,
  father_phone text,
  father_workplace text,
  mother_name text,
  mother_phone text,
  mother_workplace text,
  home_address text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.children enable row level security;

create policy "children_all_own" on public.children
  for all using (
    exists (
      select 1 from public.groups g
      where g.id = children.group_id and g.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.groups g
      where g.id = children.group_id and g.teacher_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 4. LEARNING_DOMAINS (суралцахуйн 7 чиглэл)
-- ---------------------------------------------------------------------
create table if not exists public.learning_domains (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.learning_domains enable row level security;

-- Багш бүр зөвхөн өөрийн чиглэлийн жагсаалтыг харж, засна (шинээр бүртгүүлэхэд
-- handle_new_user() trigger-ээр стандарт 7 чиглэл автоматаар үүснэ)
create policy "domains_all_own" on public.learning_domains
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- ---------------------------------------------------------------------
-- 5. OBSERVATIONS (ажиглалт тэмдэглэл)
-- ---------------------------------------------------------------------
create table if not exists public.observations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  domain_id uuid not null references public.learning_domains (id),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  observed_on date not null default current_date,
  level smallint not null check (level between 1 and 4),
  note text,
  stage text check (stage in ('garaa', 'yavts')),
  created_at timestamptz not null default now()
);

create index if not exists observations_child_idx on public.observations (child_id);
create index if not exists observations_teacher_idx on public.observations (teacher_id);
create index if not exists observations_domain_idx on public.observations (domain_id);
create index if not exists observations_observed_on_idx on public.observations (observed_on);
create index if not exists observations_stage_idx on public.observations (stage);

alter table public.observations enable row level security;

create policy "observations_all_own" on public.observations
  for all using (auth.uid() = teacher_id)
  with check (auth.uid() = teacher_id);

-- ---------------------------------------------------------------------
-- 6. OBSERVATION_MEDIA (ажиглалтад хавсаргасан зураг/бичлэг)
-- ---------------------------------------------------------------------
create table if not exists public.observation_media (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.observations (id) on delete cascade,
  file_url text not null,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  created_at timestamptz not null default now()
);

alter table public.observation_media enable row level security;

create policy "observation_media_all_own" on public.observation_media
  for all using (
    exists (
      select 1 from public.observations o
      where o.id = observation_media.observation_id and o.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.observations o
      where o.id = observation_media.observation_id and o.teacher_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 7. STORAGE BUCKETS + POLICIES
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('child-photos', 'child-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('observation-media', 'observation-media', true)
on conflict (id) do nothing;

-- Файлын зам: {auth.uid()}/... хэлбэртэй байх ёстой (эхний фолдер = багшийн uid)
create policy "child_photos_read" on storage.objects
  for select using (bucket_id = 'child-photos');

create policy "child_photos_write_own" on storage.objects
  for insert with check (
    bucket_id = 'child-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "child_photos_update_own" on storage.objects
  for update using (
    bucket_id = 'child-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "child_photos_delete_own" on storage.objects
  for delete using (
    bucket_id = 'child-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "observation_media_read" on storage.objects
  for select using (bucket_id = 'observation-media');

create policy "observation_media_write_own" on storage.objects
  for insert with check (
    bucket_id = 'observation-media' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "observation_media_update_own" on storage.objects
  for update using (
    bucket_id = 'observation-media' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "observation_media_delete_own" on storage.objects
  for delete using (
    bucket_id = 'observation-media' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- 8. FITNESS_TESTS (биеийн тамирын сорил: Хурд, Хүч, Авхаалж самбаа, Тэнцвэр)
-- ---------------------------------------------------------------------
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

-- =====================================================================
-- Дуусав. Дараа нь Supabase Dashboard -> Project Settings -> API
-- хуудаснаас Project URL болон anon public key-г аваад .env.local-д тохируулна.
-- =====================================================================
