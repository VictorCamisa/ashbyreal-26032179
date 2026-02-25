
-- Fix April invoice total to match bank (R$ 7,125.88)
UPDATE credit_card_invoices 
SET total_value = 7125.88, updated_at = NOW()
WHERE credit_card_id = 'd8c14c62-e9e4-48aa-9fe2-018763dc6de0' 
AND competencia = '2026-04-01';

-- Fix May invoice total to match bank (R$ 5,936.34)
UPDATE credit_card_invoices 
SET total_value = 5936.34, updated_at = NOW()
WHERE credit_card_id = 'd8c14c62-e9e4-48aa-9fe2-018763dc6de0' 
AND competencia = '2026-05-01';

-- Delete all PROJETADO transactions for Azul - they're inflating future months
-- The sync should recreate them correctly on next resync
DELETE FROM credit_card_transactions
WHERE credit_card_id = 'd8c14c62-e9e4-48aa-9fe2-018763dc6de0'
AND item_status = 'PROJETADO';

-- Delete invoices for months that only had PROJETADO data (June 2026 onwards)
DELETE FROM credit_card_invoices
WHERE credit_card_id = 'd8c14c62-e9e4-48aa-9fe2-018763dc6de0'
AND competencia >= '2026-06-01';
