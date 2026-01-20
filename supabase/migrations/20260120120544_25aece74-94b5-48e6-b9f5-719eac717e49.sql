-- Deletar transações financeiras vinculadas às faturas do cartão LATAM
DELETE FROM transactions
WHERE origin = 'FATURA_CARTAO'
AND origin_reference_id IN (
  'd707d050-b143-4551-ab7e-eb1d5d7cbb47',
  '241d23a3-374c-4e76-8173-902069502464',
  '50ad3ceb-4447-47da-9c50-3dacb8a72d44',
  'e3923572-a679-4f9b-94b5-1e7732865c6e',
  '7a41ad83-acb5-46fe-bc55-4e2cab26b0c2',
  '18057b10-86de-4b17-92bb-af48ed562303',
  'b5e50d41-3f47-491b-9aa5-e9b45d6e377e',
  '80608222-3f0d-4f92-9215-d5bb136f453b',
  '3f8b4e98-b1de-433d-a56a-68f5a70e9482',
  '2ffce2a2-4c73-456f-b759-3e273945c87f',
  '52faa62d-849d-46a9-b736-3f5ddaee5364'
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