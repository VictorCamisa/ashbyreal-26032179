
-- One-time cleanup: remove all duplicate transactions (keep oldest per group)
DELETE FROM transactions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY description, amount, due_date ORDER BY created_at ASC) as rn
    FROM transactions
    WHERE due_date >= '2026-03-01'
  ) ranked
  WHERE rn > 1
);
