
-- Update the invoice total to match the actual transactions
UPDATE credit_card_invoices
SET total_value = (
  SELECT COALESCE(SUM(amount), 0)
  FROM credit_card_transactions
  WHERE credit_card_id = credit_card_invoices.credit_card_id
    AND competencia = credit_card_invoices.competencia
)
WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
  AND competencia = '2026-02-01';
