
-- =============================================
-- LIMPEZA DE DUPLICATAS E RECALCULO DE FATURAS
-- =============================================

-- 1. Criar função para calcular competência correta baseada no closing_day
CREATE OR REPLACE FUNCTION public.calculate_competencia_date(
  purchase_date DATE,
  closing_day INTEGER
) RETURNS DATE AS $$
DECLARE
  result_date DATE;
  purchase_day INTEGER;
BEGIN
  purchase_day := EXTRACT(DAY FROM purchase_date);
  
  IF purchase_day <= closing_day THEN
    result_date := DATE_TRUNC('month', purchase_date)::DATE;
  ELSE
    result_date := (DATE_TRUNC('month', purchase_date) + INTERVAL '1 month')::DATE;
  END IF;
  
  RETURN result_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Identificar e manter apenas uma transação por grupo de duplicatas
WITH duplicates AS (
  SELECT 
    cct.id,
    cct.credit_card_id,
    cct.description,
    cct.purchase_date,
    cct.amount,
    cct.competencia,
    public.calculate_competencia_date(cct.purchase_date, COALESCE(cc.closing_day, 10)) as correct_competencia,
    ROW_NUMBER() OVER (
      PARTITION BY cct.credit_card_id, cct.description, cct.purchase_date, cct.amount
      ORDER BY 
        CASE WHEN cct.competencia = public.calculate_competencia_date(cct.purchase_date, COALESCE(cc.closing_day, 10))
             THEN 0 ELSE 1 END,
        cct.created_at ASC
    ) as rn
  FROM credit_card_transactions cct
  JOIN credit_cards cc ON cc.id = cct.credit_card_id
),
to_delete AS (
  SELECT id FROM duplicates WHERE rn > 1
)
DELETE FROM credit_card_transactions WHERE id IN (SELECT id FROM to_delete);

-- 3. Corrigir competência das transações restantes
UPDATE credit_card_transactions cct
SET competencia = public.calculate_competencia_date(cct.purchase_date, COALESCE(cc.closing_day, 10))
FROM credit_cards cc
WHERE cct.credit_card_id = cc.id
  AND cct.competencia != public.calculate_competencia_date(cct.purchase_date, COALESCE(cc.closing_day, 10));

-- 4. Zerar totais das faturas
UPDATE credit_card_invoices SET total_value = 0;

-- 5. Recalcular totais baseado nas transações
UPDATE credit_card_invoices ci
SET total_value = COALESCE(totals.total, 0),
    updated_at = now()
FROM (
  SELECT 
    credit_card_id,
    competencia,
    SUM(amount) as total
  FROM credit_card_transactions
  GROUP BY credit_card_id, competencia
) totals
WHERE ci.credit_card_id = totals.credit_card_id
  AND ci.competencia = totals.competencia;

-- 6. Remover faturas órfãs
DELETE FROM credit_card_invoices
WHERE total_value = 0 OR total_value IS NULL;

-- 7. Criar faturas faltantes
INSERT INTO credit_card_invoices (credit_card_id, competencia, total_value, status)
SELECT 
  cct.credit_card_id,
  cct.competencia,
  SUM(cct.amount),
  'ABERTA'
FROM credit_card_transactions cct
LEFT JOIN credit_card_invoices ci ON ci.credit_card_id = cct.credit_card_id AND ci.competencia = cct.competencia
WHERE ci.id IS NULL
GROUP BY cct.credit_card_id, cct.competencia;
