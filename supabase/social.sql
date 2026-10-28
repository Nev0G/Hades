-- HADES : module social (classements, amis, défis). À exécuter APRÈS schema.sql dans l'éditeur SQL Supabase.
-- Les scores sont calculés et envoyés par l'application (mode « confiance ») : ils sont lisibles par les autres
-- utilisateurs mais jamais les données d'entraînement détaillées, qui restent privées (RLS de schema.sql).

create extension if not exists pgcrypto;

-- ---------- Profils publics (pseudo + progression) ----------
create table if not exists public.public_profiles (
  user_id      uuid primary key default auth.uid(),
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  xp           integer not null default 0,
  level        integer not null default 1,
  week_xp      integer not null default 0,
  rank_index   integer not null default 0 check (rank_index between 0 and 8),
  rank_score   real not null default 0,
  muscle_ranks jsonb not null default '{}'::jsonb,
  updated_at   bigint
);
alter table public.public_profiles enable row level security;
drop policy if exists pp_read on public.public_profiles;
drop policy if exists pp_insert on public.public_profiles;
drop policy if exists pp_update on public.public_profiles;
drop policy if exists pp_delete on public.public_profiles;
create policy pp_read   on public.public_profiles for select to authenticated using (true);
create policy pp_insert on public.public_profiles for insert to authenticated with check (user_id = auth.uid());
create policy pp_update on public.public_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pp_delete on public.public_profiles for delete to authenticated using (user_id = auth.uid());

-- Personnalisation du profil (ajoutée après la première version : rejouable).
alter table public.public_profiles
  add column if not exists display_name text check (display_name is null or char_length(display_name) <= 24),
  add column if not exists bio text check (bio is null or char_length(bio) <= 160),
  add column if not exists avatar text check (avatar is null or char_length(avatar) <= 8),
  add column if not exists avatar_color text check (avatar_color is null or avatar_color ~ '^#[0-9A-Fa-f]{6}$'),
  add column if not exists title text check (title is null or char_length(title) <= 40);

-- ---------- Amis ----------
create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  requester  uuid not null default auth.uid() references public.public_profiles(user_id) on delete cascade,
  addressee  uuid not null references public.public_profiles(user_id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));
alter table public.friendships enable row level security;
drop policy if exists fr_read on public.friendships;
drop policy if exists fr_insert on public.friendships;
drop policy if exists fr_accept on public.friendships;
drop policy if exists fr_delete on public.friendships;
create policy fr_read   on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
create policy fr_insert on public.friendships for insert to authenticated with check (requester = auth.uid() and status = 'pending');
create policy fr_accept on public.friendships for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid());
create policy fr_delete on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

-- ---------- Défis ----------
create table if not exists public.challenges (
  id         uuid primary key default gen_random_uuid(),
  creator    uuid not null default auth.uid(),
  title      text not null check (char_length(title) between 3 and 60),
  metric     text not null check (metric in ('xp', 'volume', 'sessions')),
  start_at   bigint not null,
  end_at     bigint not null,
  is_public  boolean not null default false,
  code       text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);
create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id      uuid not null default auth.uid(),
  username     text not null,
  score        real not null default 0,
  updated_at   bigint,
  primary key (challenge_id, user_id)
);

-- Évite la récursion de politiques RLS (challenges <-> challenge_members).
create or replace function public.is_member(cid uuid) returns boolean
  language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.challenge_members where challenge_id = cid and user_id = auth.uid()) $$;
create or replace function public.is_public_challenge(cid uuid) returns boolean
  language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.challenges where id = cid and is_public) $$;
create or replace function public.is_challenge_creator(cid uuid) returns boolean
  language sql security definer stable set search_path = public as
$$ select exists (select 1 from public.challenges where id = cid and creator = auth.uid()) $$;

alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
drop policy if exists ch_read on public.challenges;
drop policy if exists ch_insert on public.challenges;
drop policy if exists ch_delete on public.challenges;
create policy ch_read   on public.challenges for select to authenticated using (is_public or creator = auth.uid() or public.is_member(id));
create policy ch_insert on public.challenges for insert to authenticated with check (creator = auth.uid());
create policy ch_delete on public.challenges for delete to authenticated using (creator = auth.uid());

drop policy if exists cm_read on public.challenge_members;
drop policy if exists cm_insert on public.challenge_members;
drop policy if exists cm_update on public.challenge_members;
drop policy if exists cm_delete on public.challenge_members;
create policy cm_read   on public.challenge_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(challenge_id) or public.is_public_challenge(challenge_id));
create policy cm_insert on public.challenge_members for insert to authenticated
  with check (user_id = auth.uid() and (public.is_public_challenge(challenge_id) or public.is_challenge_creator(challenge_id)));
create policy cm_update on public.challenge_members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cm_delete on public.challenge_members for delete to authenticated using (user_id = auth.uid());

-- Rejoindre un défi privé avec son code (les défis privés ne sont pas listables).
create or replace function public.join_challenge(p_code text) returns uuid
  language plpgsql security definer set search_path = public as
$$
declare cid uuid; uname text;
begin
  select id into cid from public.challenges where code = upper(trim(p_code)) and end_at > (extract(epoch from now()) * 1000)::bigint;
  if cid is null then raise exception 'DEFI INTROUVABLE OU TERMINE'; end if;
  select username into uname from public.public_profiles where user_id = auth.uid();
  if uname is null then raise exception 'PROFIL PUBLIC REQUIS'; end if;
  insert into public.challenge_members (challenge_id, user_id, username) values (cid, auth.uid(), uname) on conflict do nothing;
  return cid;
end;
$$;
revoke all on function public.join_challenge(text) from public;
grant execute on function public.join_challenge(text) to authenticated;
