-- Atualizar cartão existente com provider correto
UPDATE public.credit_cards 
SET card_provider = 'ITAU_EMPRESAS', closing_day = 8, due_day = 28
WHERE id = 'e3debabd-1bc4-4702-b4fb-4b5713fd00b3';

-- Criar cartões para cada provedor de fatura
INSERT INTO public.credit_cards (name, card_provider, entity_id, closing_day, due_day, is_active)
VALUES 
  ('LATAM Pass Itaú', 'LATAM', '173067f3-702c-46f6-9940-380baa8c8f10', 5, 15, true),
  ('Azul Itaucard', 'AZUL', '173067f3-702c-46f6-9940-380baa8c8f10', 10, 20, true),
  ('Mercado Pago', 'MERCADO_LIVRE', '173067f3-702c-46f6-9940-380baa8c8f10', 1, 10, true),
  ('Santander Smiles', 'SANTANDER_SMILES', '173067f3-702c-46f6-9940-380baa8c8f10', 15, 25, true);