-- Test des règles RLS (rejouable sur un Postgres local avec un faux schéma auth). Échoue à la première anomalie.
\set ON_ERROR_STOP on
create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', u::text, false); execute 'set role authenticated'; end $$;
create or replace function pg_temp.expect_fail(q text, why text) returns void language plpgsql as $$ begin
  begin execute q; raise exception 'AURAIT DU ECHOUER: %', why;
  exception when insufficient_privilege or check_violation or raise_exception or unique_violation or foreign_key_violation then
    if sqlerrm like 'AURAIT DU ECHOUER%' then raise; end if; end; end $$;
create or replace function pg_temp.expect_rows(q text, n int, why text) returns void language plpgsql as $$ declare c int; begin
  execute 'select count(*) from (' || q || ') x' into c;
  if c <> n then raise exception 'ATTENDU % lignes, obtenu % : %', n, c, why; end if; end $$;

\set A '''aaaaaaaa-0000-4000-8000-000000000001'''
\set B '''bbbbbbbb-0000-4000-8000-000000000002'''
\set C '''cccccccc-0000-4000-8000-000000000003'''

-- Profils publics
select pg_temp.as_user(:A); insert into public_profiles(username, xp) values ('alice', 500);
select pg_temp.as_user(:B); insert into public_profiles(username, xp) values ('bob', 300);
select pg_temp.as_user(:C); insert into public_profiles(username, xp) values ('carol', 100);
select pg_temp.expect_fail($$insert into public_profiles(user_id, username) values ('aaaaaaaa-0000-4000-8000-000000000001','alice2')$$, 'doublon user_id');
select pg_temp.expect_fail($$insert into public_profiles(user_id, username) values ('dddddddd-0000-4000-8000-000000000004','usurpe')$$, 'créer le profil d un autre');
select pg_temp.expect_fail($$insert into public_profiles(username) values ('alice')$$, 'pseudo unique');
select pg_temp.expect_fail($$insert into public_profiles(username) values ('X')$$, 'format du pseudo');
select pg_temp.expect_rows('select 1 from public_profiles', 3, 'classement lisible par tous');
update public_profiles set xp = 9999 where username = 'alice';   -- C modifie le profil d Alice : 0 ligne
select pg_temp.as_user(:A); select pg_temp.expect_rows($$select 1 from public_profiles where username='alice' and xp=500$$, 1, 'profil d autrui intact');

-- Amis
insert into friendships(addressee) values (:B);
select pg_temp.expect_fail($$insert into friendships(addressee) values ('aaaaaaaa-0000-4000-8000-000000000001')$$, 'soi-même');
select pg_temp.expect_fail($$insert into friendships(requester, addressee) values ('bbbbbbbb-0000-4000-8000-000000000002','aaaaaaaa-0000-4000-8000-000000000001')$$, 'demande au nom d un autre');
select pg_temp.as_user(:B);
select pg_temp.expect_fail($$insert into friendships(addressee) values ('aaaaaaaa-0000-4000-8000-000000000001')$$, 'doublon inversé');
select pg_temp.expect_rows('select 1 from friendships', 1, 'B voit la demande');
select pg_temp.as_user(:C); select pg_temp.expect_rows('select 1 from friendships', 0, 'C ne voit rien');
select pg_temp.as_user(:A); update friendships set status = 'accepted';  -- le demandeur ne peut pas accepter
select pg_temp.expect_rows($$select 1 from friendships where status='pending'$$, 1, 'A ne peut pas s auto-accepter');
select pg_temp.as_user(:B); update friendships set status = 'accepted';
select pg_temp.expect_rows($$select 1 from friendships where status='accepted'$$, 1, 'B accepte');

-- Défis
select pg_temp.as_user(:A);
insert into challenges(title, metric, start_at, end_at, is_public) values ('Public A', 'xp', 0, 99999999999999, true);
insert into challenges(title, metric, start_at, end_at, is_public) values ('Prive A', 'volume', 0, 99999999999999, false);
insert into challenge_members(challenge_id, username) select id, 'alice' from challenges;
select pg_temp.expect_fail($$insert into challenges(title, metric, start_at, end_at) values ('x', 'xp', 0, 1)$$, 'titre trop court');
select pg_temp.expect_fail($$insert into challenges(title, metric, start_at, end_at) values ('Valide', 'xp', 5, 1)$$, 'fin avant début');
select pg_temp.expect_fail($$insert into challenges(creator, title, metric, start_at, end_at) values ('bbbbbbbb-0000-4000-8000-000000000002','Usurpe','xp',0,1)$$, 'créer au nom d un autre');
select pg_temp.as_user(:C);
select pg_temp.expect_rows('select 1 from challenges', 1, 'C ne voit que le défi public');
select pg_temp.expect_rows('select 1 from challenge_members', 1, 'membres du public seulement');
insert into challenge_members(challenge_id, username) select id, 'carol' from challenges where is_public;
select pg_temp.expect_rows('select 1 from challenge_members', 2, 'C a rejoint le public');
update challenge_members set score = 42 where username = 'carol';
update challenge_members set score = 777 where username = 'alice';
select pg_temp.expect_rows($$select 1 from challenge_members where username='alice' and score = 0$$, 1, 'score d Alice intact');
select pg_temp.expect_rows($$select 1 from challenge_members where username='carol' and score = 42$$, 1, 'score de C mis à jour');
-- Défi privé : rejoindre par code uniquement
select pg_temp.as_user(:A); create temp table code as select code from challenges where not is_public; grant select on code to authenticated;
select pg_temp.as_user(:B);
select pg_temp.expect_rows('select 1 from challenges where not is_public', 0, 'privé invisible sans code');
select join_challenge((select code from code));
select pg_temp.expect_rows('select 1 from challenges where not is_public', 1, 'privé visible après avoir rejoint');
select pg_temp.expect_fail($$select join_challenge('ZZZZZZ')$$, 'code inconnu');
select join_challenge((select code from code));  -- C a un profil public : peut rejoindre avec le code

-- Données personnelles : privées
reset role; select pg_temp.as_user(:A);
insert into sessions(id, name, started_at) values ('s1', 'Push', 1);
insert into sets(id, session_id, exercise_id, weight, reps) values ('x1', 's1', 'seed-SQUAT', 100, 5);
select pg_temp.as_user(:B); select pg_temp.expect_rows('select 1 from sessions', 0, 'séances privées');
select pg_temp.expect_rows('select 1 from sets', 0, 'séries privées');
select pg_temp.expect_fail($$insert into sets(id, session_id, exercise_id, user_id) values ('x2','s1','e','aaaaaaaa-0000-4000-8000-000000000001')$$, 'écrire chez autrui');
-- Upsert façon PostgREST (merge-duplicates) sur sa propre ligne
select pg_temp.as_user(:A);
insert into sets(id, session_id, exercise_id, weight, reps) values ('x1', 's1', 'seed-SQUAT', 110, 5) on conflict (id) do update set weight = excluded.weight;
select pg_temp.expect_rows($$select 1 from sets where weight = 110$$, 1, 'upsert OK');
reset role;
\echo RLS_OK
