-- Limpar todos os dados do cartão Latam Pass Itaú (c2478444-b02b-4d2a-887e-13771017ec5e)

-- 1. Deletar transações do cartão
DELETE FROM credit_card_transactions 
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';

-- 2. Deletar faturas do cartão
DELETE FROM credit_card_invoices 
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';

-- 3. Deletar registros de importação do cartão
DELETE FROM credit_card_imports 
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';

-- 4. Deletar compras parceladas do cartão
DELETE FROM card_purchases 
WHERE credit_card_id = 'c2478444-b02b-4d2a-887e-13771017ec5e';