create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema auth; create schema storage;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table storage.buckets (id text primary key, name text, public boolean);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid default auth.uid());
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on functions to authenticated;
