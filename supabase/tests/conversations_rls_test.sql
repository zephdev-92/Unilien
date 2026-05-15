-- =============================================================================
-- Tests RLS — conversations & liaison_messages
-- =============================================================================
-- Régression de la fuite des conversations privées (RGPD art. 9).
-- Avant la migration 064, un employé ajouté à l'équipe pouvait lire TOUTES les
-- conversations privées historiques entre l'employeur et les autres employés.
-- cf. supabase/migrations_archive/064_fix_private_conversations_rls.sql
--
-- Lancement : `npm run test:db` (nécessite `supabase start`).
-- =============================================================================

begin;
select plan(8);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
-- 1 employeur + 2 employés (A et B) de la même équipe.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'employer@test.local'),
  ('00000000-0000-0000-0000-0000000000a1', 'employee-a@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'employee-b@test.local');

insert into public.profiles (id, role, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000e1', 'employer', 'Emma',  'Ployeur'),
  ('00000000-0000-0000-0000-0000000000a1', 'employee', 'Alice', 'Auxi'),
  ('00000000-0000-0000-0000-0000000000b2', 'employee', 'Bob',   'Auxi');

-- Lignes role-specific (référencées par les FK de `contracts`).
insert into public.employers (profile_id, address) values
  ('00000000-0000-0000-0000-0000000000e1', '{}'::jsonb);

insert into public.employees (profile_id) values
  ('00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000b2');

-- Contrats actifs : A et B sont tous deux dans l'équipe de l'employeur.
insert into public.contracts
  (employer_id, employee_id, contract_type, start_date, weekly_hours, hourly_rate, status)
values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1',
   'CDI', '2026-01-01', 35, 15, 'active'),
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b2',
   'CDI', '2026-01-01', 35, 15, 'active');

-- Conversations : 1 privée (employeur ↔ A) + 1 d'équipe.
insert into public.conversations (id, employer_id, type, participant_ids) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e1', 'private',
   array['00000000-0000-0000-0000-0000000000e1',
         '00000000-0000-0000-0000-0000000000a1']::uuid[]),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e1', 'team',
   array[]::uuid[]);

-- Messages : 1 dans la conv privée, 1 dans la conv d'équipe (envoyés par l'employeur).
insert into public.liaison_messages
  (id, employer_id, sender_id, sender_role, content, conversation_id)
values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000e1', 'employer', 'message prive',
   '00000000-0000-0000-0000-0000000000c1'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000e1', 'employer', 'message equipe',
   '00000000-0000-0000-0000-0000000000c2');

-- ─── Helper : exécute une requête de comptage sous l'identité d'un user ──────
-- Bascule sur le rôle `authenticated` + pose les claims JWT (auth.uid()),
-- exécute la requête (RLS appliquée), puis restaure le rôle.
create function tests_count_as(p_uid uuid, p_query text) returns integer
  language plpgsql as $$
declare
  v_count integer;
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  set local role authenticated;
  execute p_query into v_count;
  reset role;
  return v_count;
end;
$$;

-- ─── conversations : policy SELECT ───────────────────────────────────────────
select is(
  tests_count_as('00000000-0000-0000-0000-0000000000b2',
    $$ select count(*) from public.conversations
       where id = '00000000-0000-0000-0000-0000000000c1' $$),
  0,
  'employe B (equipe) ne voit PAS la conversation privee employeur<->A [regression mig 064]'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000000a1',
    $$ select count(*) from public.conversations
       where id = '00000000-0000-0000-0000-0000000000c1' $$),
  1,
  'employe A (participant) voit la conversation privee'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000000e1',
    $$ select count(*) from public.conversations
       where id = '00000000-0000-0000-0000-0000000000c1' $$),
  1,
  'employeur voit sa conversation privee'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000000b2',
    $$ select count(*) from public.conversations
       where id = '00000000-0000-0000-0000-0000000000c2' $$),
  1,
  'employe B voit la conversation d''equipe (contrat actif)'
);

-- ─── liaison_messages : policy SELECT (cascade via la conversation) ─────────
select is(
  tests_count_as('00000000-0000-0000-0000-0000000000b2',
    $$ select count(*) from public.liaison_messages
       where id = '00000000-0000-0000-0000-0000000000d1' $$),
  0,
  'employe B ne voit PAS le message de la conversation privee [cascade mig 064]'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000000a1',
    $$ select count(*) from public.liaison_messages
       where id = '00000000-0000-0000-0000-0000000000d1' $$),
  1,
  'employe A voit le message de la conversation privee'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000000b2',
    $$ select count(*) from public.liaison_messages
       where id = '00000000-0000-0000-0000-0000000000d2' $$),
  1,
  'employe B voit le message de la conversation d''equipe'
);

-- ─── Total : B ne voit qu'1 conversation sur 2 ──────────────────────────────
select is(
  tests_count_as('00000000-0000-0000-0000-0000000000b2',
    $$ select count(*) from public.conversations $$),
  1,
  'employe B ne voit au total que la conversation d''equipe (pas la privee)'
);

select * from finish();
rollback;
