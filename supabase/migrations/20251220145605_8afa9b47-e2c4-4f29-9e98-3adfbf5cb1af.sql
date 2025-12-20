
-- Corrigir transações marcadas como PAGO sem data de pagamento -> PREVISTO
UPDATE transactions 
SET status = 'PREVISTO' 
WHERE status = 'PAGO' 
AND (payment_date IS NULL OR payment_date = '');

-- Corrigir transações PAGO com vencimento futuro -> PREVISTO  
UPDATE transactions 
SET status = 'PREVISTO' 
WHERE status = 'PAGO' 
AND due_date::date > CURRENT_DATE;

-- Marcar como ATRASADO as que já venceram e não foram pagas
UPDATE transactions 
SET status = 'ATRASADO' 
WHERE status = 'PREVISTO' 
AND due_date::date < CURRENT_DATE;
