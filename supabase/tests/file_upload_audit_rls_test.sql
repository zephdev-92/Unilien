-- =============================================================================
-- Tests RLS — file_upload_audit (migration 065)
-- =============================================================================
-- Bug initial (mig 013) : la policy INSERT avait un WITH CHECK (true) qui
-- laissait n'importe quel utilisateur `authenticated` insérer des lignes
-- arbitraires dans le journal d'audit -> empoisonnement possible de la
-- traçabilité RGPD.
-- Fix (mig 065) : INSERT restreint au seul rôle `service_role`.
-- La policy SELECT reste `auth.uid() = user_id` (chacun voit son audit).
-- cf. supabase/migrations_archive/065_fix_file_upload_audit_insert_rls.sql
-- =============================================================================

begin;
select plan(3);

-- ─── Fixtures ────────────────────────────────────────────────────────────────
-- user_id référence auth.users directement (pas de profil nécessaire).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000065a1', 'user-a-65@test.local'),
  ('00000000-0000-0000-0000-0000000065b2', 'user-b-65@test.local');

-- Entrées d'audit existantes (insérées en tant que postgres, hors RLS).
insert into public.file_upload_audit
  (user_id, bucket_id, file_path, file_name, operation)
values
  ('00000000-0000-0000-0000-0000000065a1', 'justificatifs', 'a1/doc.pdf', 'doc.pdf', 'INSERT'),
  ('00000000-0000-0000-0000-0000000065b2', 'justificatifs', 'b2/doc.pdf', 'doc.pdf', 'INSERT');

-- ─── Helpers ─────────────────────────────────────────────────────────────────
-- Exécute une instruction sous l'identité d'un user : NULL si OK, SQLSTATE sinon.
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

-- Compte les lignes visibles sous l'identité d'un user.
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
-- 1. Régression mig 065 : un utilisateur authenticated ne peut PAS écrire
--    dans le journal d'audit.
select is(
  tests_run_as('00000000-0000-0000-0000-0000000065a1',
    $$ insert into public.file_upload_audit
         (user_id, bucket_id, file_path, file_name, operation)
       values ('00000000-0000-0000-0000-0000000065a1', 'justificatifs',
               'a1/fake.pdf', 'fake.pdf', 'INSERT') $$),
  '42501',
  'un utilisateur authenticated ne peut pas inserer dans file_upload_audit'
);

-- 2. SELECT : chaque utilisateur voit sa propre entree d'audit.
select is(
  tests_count_as('00000000-0000-0000-0000-0000000065a1',
    $$ select count(*) from public.file_upload_audit
       where user_id = '00000000-0000-0000-0000-0000000065a1' $$),
  1,
  'un utilisateur voit sa propre entree d''audit'
);

-- 3. SELECT : un utilisateur ne voit PAS l'entree d'audit d'un autre.
select is(
  tests_count_as('00000000-0000-0000-0000-0000000065a1',
    $$ select count(*) from public.file_upload_audit
       where user_id = '00000000-0000-0000-0000-0000000065b2' $$),
  0,
  'un utilisateur ne voit pas l''entree d''audit d''un autre utilisateur'
);

select * from finish();
rollback;
