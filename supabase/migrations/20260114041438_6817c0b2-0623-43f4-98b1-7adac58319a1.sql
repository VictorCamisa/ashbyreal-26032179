
-- Deletar clientes duplicados, mantendo apenas o mais recente de cada telefone
DELETE FROM clientes
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY telefone ORDER BY created_at DESC) as rn
    FROM clientes
  ) sub
  WHERE rn > 1
);
