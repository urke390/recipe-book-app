-- 0001_init.sql -- Recipe Book app schema.

create extension if not exists pgcrypto;

-- Reference data ------------------------------------------------------------

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table ingredients (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null,
  description text,
  default_unit text not null default 'גרם',
  created_at timestamptz not null default now()
);

create table parameters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text,
  created_at timestamptz not null default now()
);

-- Recipes ---------------------------------------------------------------

create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  base_quantity numeric not null default 4,
  base_unit text not null default 'מנות',
  parameter_ids uuid[] not null default '{}',
  parameter_values jsonb not null default '[]',
  "order" integer,
  created_at timestamptz not null default now()
);

create table recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  "order" integer not null default 0,
  type text not null check (type in ('ingredient_addition', 'wait_time', 'action', 'parameter_display')),
  title text,
  instructions text,
  ingredient_id uuid references ingredients(id) on delete set null,
  ingredient_name text,
  category_name text,
  base_quantity numeric,
  unit text,
  duration_minutes numeric,
  parameter_id uuid references parameters(id) on delete set null,
  parameter_name text,
  parameter_value_min numeric,
  parameter_value_max numeric,
  notes text,
  is_final_step boolean not null default false,
  created_at timestamptz not null default now()
);

create index recipe_steps_recipe_id_idx on recipe_steps(recipe_id, "order");

-- Guided production tracking ("ייצור מודרך") --------------------------------
-- No day-schedule linkage, no history table: completing/cancelling a
-- session deletes its row (see src/pages/ProductionRunner.jsx).

create table production_sessions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id),
  recipe_name text,
  production_mode text not null default 'scaled' check (production_mode in ('scaled', 'cycles')),
  vat_number integer not null default 1,
  vat_volume numeric,
  scale_factor numeric not null default 1,
  total_vats integer not null default 1,
  total_production_volume numeric,
  current_step_index integer not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  notes text,
  steps_completed integer[] not null default '{}',
  completed_vats integer[] not null default '{}',
  step_started_at timestamptz,
  step_duration_seconds integer,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index production_sessions_status_idx on production_sessions(status);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table app_secrets (
  id boolean primary key default true,
  edit_code_hash text not null,
  constraint app_secrets_singleton check (id)
);
alter table app_secrets enable row level security;
-- No policies at all: readable/writable only by the service role, used
-- exclusively inside redeem-edit-code / update-edit-code Edge Functions.

create table feedback_notes (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  note text not null,
  status text not null default 'open' check (status in ('open', 'done', 'dismissed')),
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Row Level Security ----------------------------------------------------

do $$
declare
  t text;
  editable_tables text[] := array['categories', 'ingredients', 'parameters', 'recipes', 'recipe_steps'];
begin
  foreach t in array editable_tables loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "read_all" on %I for select to authenticated using (true)', t);
    execute format('create policy "editor_insert" on %I for insert to authenticated with check ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''editor'')', t);
    execute format('create policy "editor_update" on %I for update to authenticated using ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''editor'') with check ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''editor'')', t);
    execute format('create policy "editor_delete" on %I for delete to authenticated using ((auth.jwt() -> ''app_metadata'' ->> ''role'') = ''editor'')', t);
  end loop;
end $$;

-- production_sessions: open to any authenticated (incl. anonymous) visitor -
-- running a guided production doesn't need the editor code, only editing
-- the underlying recipe library does.
alter table production_sessions enable row level security;
create policy "read_all" on production_sessions for select to authenticated using (true);
create policy "public_insert" on production_sessions for insert to authenticated with check (true);
create policy "public_update" on production_sessions for update to authenticated using (true) with check (true);
create policy "public_delete" on production_sessions for delete to authenticated using (true);

-- push_subscriptions: any signed-in visitor may register/remove their own device's subscription.
alter table push_subscriptions enable row level security;
create policy "insert_own" on push_subscriptions for insert to authenticated with check (true);
create policy "update_own" on push_subscriptions for update to authenticated using (true) with check (true);
create policy "delete_own" on push_subscriptions for delete to authenticated using (true);

-- feedback_notes: anyone can leave a note; only editors triage.
alter table feedback_notes enable row level security;
create policy "read_all" on feedback_notes for select to authenticated using (true);
create policy "insert_open" on feedback_notes for insert to authenticated with check (true);
create policy "editor_update" on feedback_notes for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');
create policy "editor_delete" on feedback_notes for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');

-- Realtime ----------------------------------------------------------------
alter publication supabase_realtime add table production_sessions;
alter publication supabase_realtime add table feedback_notes;
