-- =============================================================================
-- Tests RLS — mark_liaison_messages_read (migration 061)
-- =============================================================================
-- Bug initial : un UPDATE direct sur liaison_messages pour marquer un message
-- comme lu était silencieusement bloqué par la policy RLS UPDATE
-- (`auth.uid() = sender_id` — seul l'auteur peut modifier). Le compteur de
-- non-lus revenait après refresh.
-- Fix : RPC SECURITY DEFINER `mark_liaison_messages_read`.
-- cf. supabase/migrations_archive/061_mark_liaison_messages_read_rpc.sql
-- =============================================================================

begin;
select plan(5);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000061e1', 'employer61@test.local'),
  ('00000000-0000-0000-0000-0000000061b2', 'employee61@test.local'),
  ('00000000-0000-0000-0000-0000000061f9', 'stranger61@test.local');

insert into public.profiles (id, role, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000061e1', 'employer', 'Emma', 'Ployeur'),
  ('00000000-0000-0000-0000-0000000061b2', 'employee', 'Bob',  'Auxi'),
  ('00000000-0000-0000-0000-0000000061f9', 'employee', 'Sam',  'Etranger');

insert into public.employers (profile_id, address) values
  ('00000000-0000-0000-0000-0000000061e1', '{}'::jsonb);
insert into public.employees (profile_id) values
  ('00000000-0000-0000-0000-0000000061b2'),
  ('00000000-0000-0000-0000-0000000061f9');

-- B a un contrat actif chez l'employeur ; Sam n'a aucun lien.
insert into public.contracts
  (employer_id, employee_id, contract_type, start_date, weekly_hours, hourly_rate, status)
values
  ('00000000-0000-0000-0000-0000000061e1', '00000000-0000-0000-0000-0000000061b2',
   'CDI', '2026-01-01', 35, 15, 'active');

-- Conversation d'équipe + 1 message envoyé par l'employeur.
insert into public.conversations (id, employer_id, type, participant_ids) values
  ('00000000-0000-0000-0000-0000000061c2', '00000000-0000-0000-0000-0000000061e1',
   'team', array[]::uuid[]);
insert into public.liaison_messages
  (id, employer_id, sender_id, sender_role, content, conversation_id)
values
  ('00000000-0000-0000-0000-0000000061d1', '00000000-0000-0000-0000-0000000061e1',
   '00000000-0000-0000-0000-0000000061e1', 'employer', 'message equipe',
   '00000000-0000-0000-0000-0000000061c2');

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
-- 1. Le bug : un UPDATE direct par B (non-auteur) ne modifie aucune ligne.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000061b2',
    $$ update public.liaison_messages
         set read_by = coalesce(read_by, array[]::uuid[])
                       || '00000000-0000-0000-0000-0000000061b2'::uuid
       where id = '00000000-0000-0000-0000-0000000061d1' $$),
  null,
  'UPDATE direct par un non-auteur : pas d''erreur mais filtre RLS (0 ligne)'
);
select ok(
  not ('00000000-0000-0000-0000-0000000061b2'::uuid = any(
    coalesce((select read_by from public.liaison_messages
              where id = '00000000-0000-0000-0000-0000000061d1'), array[]::uuid[])
  )),
  'read_by reste vide apres l''UPDATE direct bloque par la RLS'
);

-- 2. Le fix : B (contrat actif) appelle le RPC -> message marque lu.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000061b2',
    $$ select public.mark_liaison_messages_read('00000000-0000-0000-0000-0000000061c2') $$),
  null,
  'mark_liaison_messages_read : autorise pour un employe de l''equipe'
);
select ok(
  (select read_by from public.liaison_messages
   where id = '00000000-0000-0000-0000-0000000061d1')
  @> array['00000000-0000-0000-0000-0000000061b2'::uuid],
  'le RPC a bien ajoute B dans read_by'
);

-- 3. Controle d'acces : un user sans lien avec l'employeur est refuse.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000061f9',
    $$ select public.mark_liaison_messages_read('00000000-0000-0000-0000-0000000061c2') $$),
  '42501',
  'mark_liaison_messages_read : refuse pour un user etranger a la conversation'
);

select * from finish();
rollback;
