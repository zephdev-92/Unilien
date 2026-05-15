-- Migration 063 : RPC initialize_leave_balance
--
-- Bug initial : un employé qui pose une demande de congé payé alors que
-- son leave_balance n'a pas encore été initialisé voyait l'erreur
-- "Le solde de congés n'a pas encore été initialisé." La cause : la
-- policy RLS `employer_manage_balances` (migration 025) restreint
-- INSERT/UPDATE/DELETE sur leave_balances à `employer_id = auth.uid()`.
-- Quand l'employé déclenchait le fallback `initializeLeaveBalance` côté
-- client (absenceService:160), l'INSERT était bloqué par RLS et
-- `initializeLeaveBalance` retournait null.
--
-- Fix : RPC SECURITY DEFINER qui autorise l'init du solde par l'employer
-- OU l'employee du contrat, sans ouvrir la policy RLS. Le calcul
-- d'`acquired_days` est porté côté serveur pour ne pas faire confiance
-- au client (port de `calculateAcquiredDays` dans
-- src/lib/absence/balanceCalculator.ts).
--
-- Même pattern que migrations 061 (liaison_messages) et 062 (log_entries).

CREATE OR REPLACE FUNCTION public.count_working_days(p_start date, p_end date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COUNT(*)::integer
  FROM generate_series(p_start, p_end, '1 day'::interval) AS d
  WHERE EXTRACT(ISODOW FROM d) BETWEEN 1 AND 6;
$$;

CREATE OR REPLACE FUNCTION public.initialize_leave_balance(
  p_contract_id uuid,
  p_leave_year text
)
RETURNS public.leave_balances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_employer_id uuid;
  v_employee_id uuid;
  v_contract_start date;
  v_leave_year_start date;
  v_effective_start date;
  v_working_days integer;
  v_acquired integer;
  v_balance public.leave_balances;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501';
  END IF;

  -- Format attendu : "YYYY-YYYY" (cf. getLeaveYear côté TS).
  IF p_leave_year !~ '^\d{4}-\d{4}$' THEN
    RAISE EXCEPTION 'Format leave_year invalide' USING ERRCODE = '22023';
  END IF;
  v_leave_year_start := make_date(split_part(p_leave_year, '-', 1)::int, 6, 1);

  SELECT employer_id, employee_id, start_date
    INTO v_employer_id, v_employee_id, v_contract_start
  FROM public.contracts
  WHERE id = p_contract_id;

  IF v_employer_id IS NULL THEN
    RAISE EXCEPTION 'Contrat introuvable' USING ERRCODE = 'P0002';
  END IF;

  IF v_user_id <> v_employer_id AND v_user_id <> v_employee_id THEN
    RAISE EXCEPTION 'Accès refusé' USING ERRCODE = '42501';
  END IF;

  -- Port fidèle de calculateAcquiredDays(TS) :
  --   effectiveStart = max(contract.startDate, leaveYearStart)
  --   workingDays    = jours ouvrables (lun-sam) effectiveStart → now
  --   months         = floor(workingDays / 24)
  --   acquired       = min(ceil(months * 2.5), 30)
  v_effective_start := GREATEST(v_contract_start, v_leave_year_start);

  IF v_effective_start > CURRENT_DATE THEN
    v_acquired := 0;
  ELSE
    v_working_days := public.count_working_days(v_effective_start, CURRENT_DATE);
    -- Division entière intentionnelle : (workingDays / 24) tronque
    v_acquired := LEAST(CEIL((v_working_days / 24) * 2.5)::integer, 30);
  END IF;

  -- Idempotent : si une balance existe déjà, on ne touche pas et on la renvoie.
  INSERT INTO public.leave_balances (
    contract_id, employee_id, employer_id, leave_year,
    acquired_days, taken_days, adjustment_days
  ) VALUES (
    p_contract_id, v_employee_id, v_employer_id, p_leave_year,
    v_acquired, 0, 0
  )
  ON CONFLICT (contract_id, leave_year) DO NOTHING;

  SELECT * INTO v_balance
  FROM public.leave_balances
  WHERE contract_id = p_contract_id AND leave_year = p_leave_year;

  RETURN v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.count_working_days(date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.count_working_days(date, date) TO authenticated;

REVOKE ALL ON FUNCTION public.initialize_leave_balance(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.initialize_leave_balance(uuid, text) TO authenticated;
