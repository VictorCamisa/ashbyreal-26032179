
-- Remove duplicate installments (keep only one per purchase per competencia)
-- First, identify and delete duplicates keeping the first one by created_at

DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY parent_purchase_id, competencia 
        ORDER BY created_at ASC
      ) as rn
    FROM credit_card_transactions
    WHERE parent_purchase_id IS NOT NULL
      AND competencia = '2026-02-01'
  ) ranked
  WHERE rn > 1
);
