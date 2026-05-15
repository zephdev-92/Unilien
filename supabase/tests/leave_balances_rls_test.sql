-- =============================================================================
-- Tests RLS — initialize_leave_balance (migration 063)
-- =============================================================================
-- Bug initial : un employé posant une demande de congé alors que son solde
-- n'était pas encore initialisé déclenchait un INSERT direct sur leave_balances,
-- bloqué par la policy RLS `employer_manage_balances` (réservée à
-- `employer_id = auth.uid()`). Résultat : "solde non initialisé".
-- Fix : RPC SECURITY DEFINER `initialize_leave_balance`, qui autorise
-- l'employeur OU l'employé du contrat, avec calcul serveur des jours acquis.
-- cf. supabase/migrations_archive/063_initialize_leave_balance_rpc.sql
-- =============================================================================

begin;
select plan(6);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000063e1', 'employer63@test.local'),
  ('00000000-0000-0000-0000-0000000063a1', 'employee63@test.local'),
  ('00000000-0000-0000-0000-0000000063f9', 'stranger63@test.local');

insert into public.profiles (id, role, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000063e1', 'employer', 'Emma',  'Ployeur'),
  ('00000000-0000-0000-0000-0000000063a1', 'employee', 'Alice', 'Auxi'),
  ('00000000-0000-0000-0000-0000000063f9', 'employee', 'Sam',   'Etranger');

insert into public.employers (profile_id, address) values
  ('00000000-0000-0000-0000-0000000063e1', '{}'::jsonb);
insert into public.employees (profile_id) values
  ('00000000-0000-0000-0000-0000000063a1'),
  ('00000000-0000-0000-0000-0000000063f9');

-- Contrat d'A chez l'employeur (id fixe pour pouvoir l'adresser au RPC).
insert into public.contracts
  (id, employer_id, employee_id, contract_type, start_date, weekly_hours, hourly_rate, status)
values
  ('00000000-0000-0000-0000-0000000063c1', '00000000-0000-0000-0000-0000000063e1',
   '00000000-0000-0000-0000-0000000063a1', 'CDI', '2026-01-01', 35, 15, 'active');

-- ─── Helper : exécute une instruction sous l'identité d'un user ─────────────
-- Renvoie NULL si l'instruction passe, le SQLSTATE si elle lève une exception.
create function tests_run_as(p_uid uuid, p_sql text) returns text
  language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
  set local role authenticated;
  execute p_sql;
  reset role;
  return null;
exception when others then
  reset role;
  return sqlstate;
end;
$$;

-- ─── Tests ───────────────────────────────────────────────────────────────────
-- 1. Le bug : un INSERT direct par l'employé est bloqué par la RLS WITH CHECK.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000063a1',
    $$ insert into public.leave_balances
         (contract_id, employee_id, employer_id, leave_year)
       values ('00000000-0000-0000-0000-0000000063c1',
               '00000000-0000-0000-0000-0000000063a1',
               '00000000-0000-0000-0000-0000000063e1', '2026-2027') $$),
  '42501',
  'INSERT direct sur leave_balances par l''employe : bloque par la RLS'
);

-- 2. Le fix : l'employé du contrat peut initialiser son solde via le RPC.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000063a1',
    $$ select public.initialize_leave_balance(
         '00000000-0000-0000-0000-0000000063c1', '2026-2027') $$),
  null,
  'initialize_leave_balance : autorise pour l''employe du contrat'
);
select ok(
  exists (
    select 1 from public.leave_balances
    where contract_id = '00000000-0000-0000-0000-0000000063c1'
      and leave_year = '2026-2027'
  ),
  'le RPC a bien cree la ligne de solde de conges'
);

-- 3. Idempotent : un second appel ne crée pas de doublon.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000063a1',
    $$ select public.initialize_leave_balance(
         '00000000-0000-0000-0000-0000000063c1', '2026-2027') $$),
  null,
  'initialize_leave_balance : second appel sans erreur'
);
select is(
  (select count(*)::integer from public.leave_balances
   where contract_id = '00000000-0000-0000-0000-0000000063c1'),
  1,
  'idempotent : une seule ligne de solde malgre deux appels'
);

-- 4. Controle d'acces : un user etranger au contrat est refuse.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000063f9',
    $$ select public.initialize_leave_balance(
         '00000000-0000-0000-0000-0000000063c1', '2026-2027') $$),
  '42501',
  'initialize_leave_balance : refuse pour un user etranger au contrat'
);

select * from finish();
rollback;
