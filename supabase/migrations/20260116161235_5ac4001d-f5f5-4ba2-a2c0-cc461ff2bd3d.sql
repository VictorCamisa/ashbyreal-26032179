
-- First, let's clear the invoice_id from all transactions to start fresh
UPDATE credit_card_transactions SET invoice_id = NULL;

-- Now let's properly link each transaction to its correct invoice
-- by matching credit_card_id and competencia
UPDATE credit_card_transactions cct
SET invoice_id = cci.id
FROM credit_card_invoices cci
WHERE cct.credit_card_id = cci.credit_card_id
  AND cct.competencia = cci.competencia;

-- Recalculate total_value for all invoices based on linked transactions
UPDATE credit_card_invoices cci
SET total_value = COALESCE((
  SELECT SUM(cct.amount)
  FROM credit_card_transactions cct
  WHERE cct.invoice_id = cci.id
), 0);

-- Create invoices for competencias that have transactions but no invoice yet
INSERT INTO credit_card_invoices (credit_card_id, competencia, total_value, status)
SELECT DISTINCT 
  cct.credit_card_id,
  cct.competencia,
  0,
  'ABERTA'::invoice_status
FROM credit_card_transactions cct
WHERE cct.invoice_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM credit_card_invoices cci 
    WHERE cci.credit_card_id = cct.credit_card_id 
      AND cci.competencia = cct.competencia
  )
ON CONFLICT DO NOTHING;

-- Link newly created invoices
UPDATE credit_card_transactions cct
SET invoice_id = cci.id
FROM credit_card_invoices cci
WHERE cct.credit_card_id = cci.credit_card_id
  AND cct.competencia = cci.competencia
  AND cct.invoice_id IS NULL;

-- Final recalculation of all totals
UPDATE credit_card_invoices cci
SET total_value = COALESCE((
  SELECT SUM(cct.amount)
  FROM credit_card_transactions cct
  WHERE cct.invoice_id = cci.id
), 0);
