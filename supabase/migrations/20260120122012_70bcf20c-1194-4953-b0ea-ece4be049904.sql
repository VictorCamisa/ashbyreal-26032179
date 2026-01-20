-- Limpar dados do cartão LATAM para reimportação

-- Deletar transações financeiras vinculadas às faturas do cartão LATAM
DELETE FROM transactions
WHERE origin = 'FATURA_CARTAO'
AND origin_reference_id IN (
  'c166b42f-2174-49f2-b2e5-b493eef13507'::uuid,
  '45bff078-62dd-4cdc-a8c2-ec37db73ef7a'::uuid,
  'f2fcc187-91d6-492c-ac89-81e1224cd36c'::uuid,
  'f735d4ed-6198-4c29-ac81-70219af2a5e4'::uuid,
  '8e5f0c11-0676-4e73-8dee-02de71a7d438'::uuid,
  '447f440b-6d3a-4729-b7e7-fe12442f6d07'::uuid,
  'de0f6dcb-c7f4-435f-80dc-c727fbb73b84'::uuid,
  '3429c5ea-7104-4c9a-bcbb-ef1d8d00ee53'::uuid,
  'ba4903fd-0e23-42af-871d-6a756390065e'::uuid,
  '1e745372-92e2-4389-a293-329db916a376'::uuid,
  'fb4fe07d-f941-4f28-922b-51b4ba4eb5f7'::uuid
);

-- Deletar todas as transações de cartão do LATAM
DELETE FROM credit_card_transactions
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';

-- Deletar todas as faturas do cartão LATAM
DELETE FROM credit_card_invoices
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';

-- Deletar todas as compras (card_purchases) do cartão LATAM
DELETE FROM card_purchases
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';

-- Deletar registros de importação do cartão LATAM
DELETE FROM credit_card_imports
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';