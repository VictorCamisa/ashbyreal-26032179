-- Deletar transações com valores > R$10.000 (provavelmente em centavos)
DELETE FROM credit_card_transactions
WHERE amount > 10000;

-- Remover transações duplicadas (manter apenas uma por cartão + descrição + valor + data)
DELETE FROM credit_card_transactions
WHERE id NOT IN (
  SELECT DISTINCT ON (credit_card_id, description, amount, purchase_date) id
  FROM credit_card_transactions
  ORDER BY credit_card_id, description, amount, purchase_date, created_at DESC
);

-- Recalcular os valores das faturas
UPDATE credit_card_invoices inv
SET total_value = COALESCE(
  (SELECT SUM(amount) 
   FROM credit_card_transactions t 
   WHERE t.credit_card_id = inv.credit_card_id 
   AND DATE_TRUNC('month', t.purchase_date::date) = DATE_TRUNC('month', inv.competencia::date)),
  0
);

-- Deletar faturas que ficaram vazias
DELETE FROM credit_card_invoices WHERE total_value <= 0;