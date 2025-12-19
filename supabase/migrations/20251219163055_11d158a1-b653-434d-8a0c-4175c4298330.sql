-- Deletar transações com valores absurdos (> R$100.000)
DELETE FROM credit_card_transactions
WHERE amount > 100000;

-- Criar tabela temporária para guardar IDs das faturas a manter (uma por cartão/competência)
CREATE TEMP TABLE faturas_to_keep AS
SELECT DISTINCT ON (credit_card_id, competencia) id
FROM credit_card_invoices
ORDER BY credit_card_id, competencia, created_at DESC;

-- Deletar faturas duplicadas
DELETE FROM credit_card_invoices
WHERE id NOT IN (SELECT id FROM faturas_to_keep);

-- Recalcular os valores das faturas baseado nas transações
UPDATE credit_card_invoices inv
SET total_value = COALESCE(
  (SELECT SUM(amount) 
   FROM credit_card_transactions t 
   WHERE t.credit_card_id = inv.credit_card_id 
   AND DATE_TRUNC('month', t.purchase_date::date) = DATE_TRUNC('month', inv.competencia::date)),
  0
);

-- Deletar faturas que ficaram com valor 0 ou negativo
DELETE FROM credit_card_invoices WHERE total_value <= 0;