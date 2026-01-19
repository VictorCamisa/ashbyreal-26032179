
-- Delete duplicate installment transactions for February 2026
-- Keep only one transaction per purchase (using the one with correct installment_number matching description)

-- Step 1: PG *FLORIDA RENTAL - should have only installment 10 (shown as 10/10 in CSV)
DELETE FROM credit_card_transactions
WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
  AND competencia = '2026-02-01'
  AND description LIKE 'PG *FLORIDA RENTAL%'
  AND NOT (description = 'PG *FLORIDA RENTAL10/10');

-- Keep only RENTAL10/10 if exists, otherwise keep first one
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY credit_card_id, competencia, REGEXP_REPLACE(description, '\d+/\d+$', '')
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
      AND competencia = '2026-02-01'
      AND description LIKE 'PG *FLORIDA RENTAL%'
  ) ranked
  WHERE rn > 1
);

-- Step 2: CERTISIGN - should have only installment 7/12 (keep first)
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY credit_card_id, competencia, purchase_date, amount
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
      AND competencia = '2026-02-01'
      AND description LIKE 'CERTISIGN%'
  ) ranked
  WHERE rn > 1
);

-- Step 3: PayU *ADIDA - should have only installment 4/8 (keep first)
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY credit_card_id, competencia, purchase_date, amount
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
      AND competencia = '2026-02-01'
      AND description LIKE 'PayU%ADIDA%'
  ) ranked
  WHERE rn > 1
);

-- Step 4: BR1*MARCO*REBUCCI - should have only installment 4/12 (keep first)
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY credit_card_id, competencia, purchase_date, amount
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
      AND competencia = '2026-02-01'
      AND description LIKE 'BR1*MARCO*REBUCCI%'
  ) ranked
  WHERE rn > 1
);

-- Step 5: SGH I 6812 - should have only installment 4/10 (keep first)
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY credit_card_id, competencia, purchase_date, amount
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
      AND competencia = '2026-02-01'
      AND description LIKE 'SGH I 6812%'
  ) ranked
  WHERE rn > 1
);

-- Step 6: MC COMERCIO DE CAL - should have only installment 3/4 (keep first)
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY credit_card_id, competencia, purchase_date, amount
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
      AND competencia = '2026-02-01'
      AND description LIKE 'MC COMERCIO DE CAL%'
  ) ranked
  WHERE rn > 1
);

-- Step 7: ELISANGELA - should have only 1 transaction for competencia 2026-02 (parcela 2/3)
DELETE FROM credit_card_transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY credit_card_id, competencia, purchase_date, amount
      ORDER BY created_at ASC
    ) as rn
    FROM credit_card_transactions
    WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
      AND competencia = '2026-02-01'
      AND description LIKE 'ELISANGELA%'
  ) ranked
  WHERE rn > 1
);

-- Finally, update the invoice total
UPDATE credit_card_invoices
SET total_value = (
  SELECT COALESCE(SUM(amount), 0)
  FROM credit_card_transactions
  WHERE credit_card_id = credit_card_invoices.credit_card_id
    AND competencia = credit_card_invoices.competencia
)
WHERE credit_card_id = (SELECT id FROM credit_cards WHERE name ILIKE '%latam%' LIMIT 1)
  AND competencia = '2026-02-01';
