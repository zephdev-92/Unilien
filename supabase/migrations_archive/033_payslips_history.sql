-- ============================================
-- Migration 033: Historique bulletins de paie
-- Table payslips + taux PAS configurable sur contracts
-- ============================================

-- ── Colonne pas_rate sur contracts ───────────────────────────────────────────
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS pas_rate NUMERIC(5,4) NOT NULL DEFAULT 0
  CONSTRAINT contracts_pas_rate_check CHECK (pas_rate >= 0 AND pas_rate <= 1);

-- ── Table payslips ────────────────────────────────────────────────────────────
CREATE TABLE public.payslips (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contract_id     UUID        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,

  -- Période
  year            INTEGER     NOT NULL,
  month           INTEGER     NOT NULL,
  period_label    TEXT        NOT NULL,

  -- Montants clés (dénormalisés pour accès rapide sans recalcul)
  gross_pay               NUMERIC(10,2)  NOT NULL,
  net_pay                 NUMERIC(10,2)  NOT NULL,
  total_hours             NUMERIC(8,2)   NOT NULL,
  pas_rate                NUMERIC(5,4)   NOT NULL DEFAULT 0,
  is_exempt_patronal_ss   BOOLEAN        NOT NULL DEFAULT false,

  -- Stockage PDF
  storage_path    TEXT,            -- chemin relatif dans le bucket "payslips"
  storage_url     TEXT,            -- URL publique signée (cache ~1h, à régénérer)

  -- Métadonnées
  generated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT payslips_month_check CHECK (month BETWEEN 1 AND 12)
);

-- Index
CREATE INDEX payslips_employer_period_idx  ON public.payslips (employer_id, year, month);
CREATE INDEX payslips_employee_idx         ON public.payslips (employee_id);
CREATE UNIQUE INDEX payslips_unique_period ON public.payslips (employee_id, contract_id, year, month);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- L'employeur gère tous ses bulletins
CREATE POLICY "payslips_employer_all"
  ON public.payslips
  FOR ALL
  USING (employer_id = auth.uid());

-- L'employé consulte ses propres bulletins
CREATE POLICY "payslips_employee_select"
  ON public.payslips
  FOR SELECT
  USING (employee_id = auth.uid());
