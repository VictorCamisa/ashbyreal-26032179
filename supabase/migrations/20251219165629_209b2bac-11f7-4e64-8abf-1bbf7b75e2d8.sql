-- Recriar os cartões de crédito
INSERT INTO public.credit_cards (name, card_provider, closing_day, due_day, is_active)
VALUES 
  ('Azul Itaucard', 'Itaú', 11, 21, true),
  ('Santander Smiles', 'Santander', 15, 25, true);