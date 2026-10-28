-- HADES : schéma Supabase (miroir des tables locales SQLite) + RLS par utilisateur.
do $$
declare t text;
begin
  foreach t in array array['profile','foods','food_entries','water','exercises','programs','program_days','program_exercises','sessions','sets','body_weights','photos','meal_templates'] loop
    execute format('create table if not exists public.%I (id text primary key, user_id uuid not null default auth.uid(), updated_at bigint, deleted int default 0, data jsonb)', t);
  end loop;
end $$;
-- NB : les colonnes métier sont ajoutées ci-dessous (identiques aux colonnes SQLite).
alter table profile add column if not exists sex text, add column if not exists age int, add column if not exists height_cm real, add column if not exists weight_kg real,
  add column if not exists goal text, add column if not exists activity text, add column if not exists tdee int, add column if not exists kcal int,
  add column if not exists protein int, add column if not exists carbs int, add column if not exists fat int, add column if not exists keep_awake int, add column if not exists username text, add column if not exists custom_targets int;
alter table foods add column if not exists name text, add column if not exists brand text, add column if not exists barcode text, add column if not exists kcal real,
  add column if not exists protein real, add column if not exists carbs real, add column if not exists fat real, add column if not exists serving_g real, add column if not exists custom int;
alter table food_entries add column if not exists date text, add column if not exists meal text, add column if not exists name text, add column if not exists grams real,
  add column if not exists kcal real, add column if not exists protein real, add column if not exists carbs real, add column if not exists fat real;
alter table water add column if not exists date text, add column if not exists glasses int;
alter table exercises add column if not exists name text, add column if not exists muscle text, add column if not exists equipment text, add column if not exists compound int, add column if not exists custom int;
alter table programs add column if not exists name text, add column if not exists fav int, add column if not exists created_at bigint;
alter table program_days add column if not exists program_id text, add column if not exists name text, add column if not exists pos int, add column if not exists fav int, add column if not exists created_at bigint;
alter table program_exercises add column if not exists day_id text, add column if not exists exercise_id text, add column if not exists pos int, add column if not exists sets int, add column if not exists rest_s int;
alter table sessions add column if not exists day_id text, add column if not exists name text, add column if not exists started_at bigint, add column if not exists ended_at bigint;
alter table sets add column if not exists session_id text, add column if not exists exercise_id text, add column if not exists idx int, add column if not exists weight real, add column if not exists reps int, add column if not exists done_at bigint;
alter table body_weights add column if not exists date text, add column if not exists weight_kg real;
alter table meal_templates add column if not exists name text, add column if not exists kind text, add column if not exists portions real, add column if not exists items text;
alter table photos add column if not exists date text, add column if not exists uri text, add column if not exists weight_kg real;

do $$
declare t text;
begin
  foreach t in array array['profile','foods','food_entries','water','exercises','programs','program_days','program_exercises','sessions','sets','body_weights','photos','meal_templates'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Stockage des photos de progression (bucket privé).
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict do nothing;
drop policy if exists photos_rw on storage.objects;
create policy photos_rw on storage.objects for all to authenticated
  using (bucket_id = 'photos' and owner = auth.uid()) with check (bucket_id = 'photos' and owner = auth.uid());
