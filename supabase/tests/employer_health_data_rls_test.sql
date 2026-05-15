-- =============================================================================
-- Tests RLS — employer_health_data (migration 058)
-- =============================================================================
-- Données de santé chiffrées (handicap, besoins) — RGPD art. 9, catégorie
-- "sensible". Les policies RLS restreignent INSERT/SELECT/UPDATE au seul
-- propriétaire (`auth.uid() = profile_id`). Ce test verrouille la
-- confidentialité en lecture : personne d'autre que l'employeur concerné —
-- pas même un membre de son équipe — ne doit voir ses données de santé.
-- cf. supabase/migrations_archive/058_pgsodium_health_data.sql
-- =============================================================================

begin;
select plan(4);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
-- 2 employeurs (E1, E2) + 1 employé (A) dans l'équipe de E1.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000058e1', 'employer1-58@test.local'),
  ('00000000-0000-0000-0000-0000000058e2', 'employer2-58@test.local'),
  ('00000000-0000-0000-0000-0000000058a1', 'employee-58@test.local');

insert into public.profiles (id, role, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000058e1', 'employer', 'Emma',  'Ployeur'),
  ('00000000-0000-0000-0000-0000000058e2', 'employer', 'Enzo',  'Ployeur'),
  ('00000000-0000-0000-0000-0000000058a1', 'employee', 'Alice', 'Auxi');

insert into public.employers (profile_id, address) values
  ('00000000-0000-0000-0000-0000000058e1', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000058e2', '{}'::jsonb);
insert into public.employees (profile_id) values
  ('00000000-0000-0000-0000-0000000058a1');

-- A a un contrat actif chez E1 (membre de l'équipe).
insert into public.contracts
  (employer_id, employee_id, contract_type, start_date, weekly_hours, hourly_rate, status)
values
  ('00000000-0000-0000-0000-0000000058e1', '00000000-0000-0000-0000-0000000058a1',
   'CDI', '2026-01-01', 35, 15, 'active');

-- Données de santé pour chaque employeur (colonnes chiffrées laissées NULL —
-- non pertinent ici, le test porte sur la visibilité de la ligne).
insert into public.employer_health_data (profile_id) values
  ('00000000-0000-0000-0000-0000000058e1'),
  ('00000000-0000-0000-0000-0000000058e2');

-- ─── Helper : compte les lignes visibles sous l'identité d'un user ──────────
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

-- ─── Tests ───────────────────────────────────────────────────────────────────
select is(
  tests_count_as('00000000-0000-0000-0000-0000000058e1',
    $$ select count(*) from public.employer_health_data
       where profile_id = '00000000-0000-0000-0000-0000000058e1' $$),
  1,
  'l''employeur voit ses propres donnees de sante'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000058e2',
    $$ select count(*) from public.employer_health_data
       where profile_id = '00000000-0000-0000-0000-0000000058e1' $$),
  0,
  'un autre employeur ne voit PAS les donnees de sante de E1'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000058a1',
    $$ select count(*) from public.employer_health_data
       where profile_id = '00000000-0000-0000-0000-0000000058e1' $$),
  0,
  'un employe de l''equipe ne voit PAS les donnees de sante de son employeur [RGPD art. 9]'
);

select is(
  tests_count_as('00000000-0000-0000-0000-0000000058e1',
    $$ select count(*) from public.employer_health_data $$),
  1,
  'l''employeur ne voit au total que sa propre ligne de donnees de sante'
);

select * from finish();
rollback;
