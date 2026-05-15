-- =============================================================================
-- Tests RLS — mark_log_entry_read (migration 062)
-- =============================================================================
-- Bug initial : un UPDATE direct sur log_entries pour marquer une entrée comme
-- lue était silencieusement bloqué par les policies RLS UPDATE (réservées à
-- author_id / employer_id / tuteur). Un employé non-auteur qui pouvait LIRE
-- l'entrée voyait son UPDATE filtré (0 ligne) -> compteur de non-lus persistant.
-- Fix : RPC SECURITY DEFINER `mark_log_entry_read`.
-- cf. supabase/migrations_archive/062_mark_log_entry_read_rpc.sql
-- =============================================================================

begin;
select plan(7);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000062e1', 'employer62@test.local'),
  ('00000000-0000-0000-0000-0000000062a1', 'employee62@test.local'),
  ('00000000-0000-0000-0000-0000000062f9', 'stranger62@test.local');

insert into public.profiles (id, role, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000062e1', 'employer', 'Emma',  'Ployeur'),
  ('00000000-0000-0000-0000-0000000062a1', 'employee', 'Alice', 'Auxi'),
  ('00000000-0000-0000-0000-0000000062f9', 'employee', 'Sam',   'Etranger');

insert into public.employers (profile_id, address) values
  ('00000000-0000-0000-0000-0000000062e1', '{}'::jsonb);
insert into public.employees (profile_id) values
  ('00000000-0000-0000-0000-0000000062a1'),
  ('00000000-0000-0000-0000-0000000062f9');

-- A a un contrat actif chez l'employeur ; Sam n'a aucun lien.
insert into public.contracts
  (employer_id, employee_id, contract_type, start_date, weekly_hours, hourly_rate, status)
values
  ('00000000-0000-0000-0000-0000000062e1', '00000000-0000-0000-0000-0000000062a1',
   'CDI', '2026-01-01', 35, 15, 'active');

-- Entrée de cahier de liaison rédigée par l'employeur.
insert into public.log_entries
  (id, employer_id, author_id, author_role, type, content)
values
  ('00000000-0000-0000-0000-0000000062c1', '00000000-0000-0000-0000-0000000062e1',
   '00000000-0000-0000-0000-0000000062e1', 'employer', 'info', 'note du jour');

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
-- 1. Le bug : un UPDATE direct par A (employé non-auteur) ne modifie rien.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000062a1',
    $$ update public.log_entries
         set read_by = coalesce(read_by, array[]::uuid[])
                       || '00000000-0000-0000-0000-0000000062a1'::uuid
       where id = '00000000-0000-0000-0000-0000000062c1' $$),
  null,
  'UPDATE direct par un employe non-auteur : pas d''erreur mais filtre RLS'
);
select ok(
  coalesce(array_length(
    (select read_by from public.log_entries
     where id = '00000000-0000-0000-0000-0000000062c1'), 1), 0) = 0,
  'read_by reste vide apres l''UPDATE direct bloque par la RLS'
);

-- 2. Le fix : A (contrat actif) appelle le RPC -> entree marquee lue.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000062a1',
    $$ select public.mark_log_entry_read('00000000-0000-0000-0000-0000000062c1') $$),
  null,
  'mark_log_entry_read : autorise pour un employe au contrat actif'
);
select ok(
  (select read_by from public.log_entries
   where id = '00000000-0000-0000-0000-0000000062c1')
  @> array['00000000-0000-0000-0000-0000000062a1'::uuid],
  'le RPC a bien ajoute A dans read_by'
);

-- 3. Idempotent : un second appel ne duplique pas A dans read_by.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000062a1',
    $$ select public.mark_log_entry_read('00000000-0000-0000-0000-0000000062c1') $$),
  null,
  'mark_log_entry_read : second appel sans erreur'
);
select is(
  array_length(
    (select read_by from public.log_entries
     where id = '00000000-0000-0000-0000-0000000062c1'), 1),
  1,
  'idempotent : A n''apparait qu''une fois dans read_by'
);

-- 4. Controle d'acces : un user sans lien avec l'employeur est refuse.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000062f9',
    $$ select public.mark_log_entry_read('00000000-0000-0000-0000-0000000062c1') $$),
  '42501',
  'mark_log_entry_read : refuse pour un user etranger'
);

select * from finish();
rollback;
