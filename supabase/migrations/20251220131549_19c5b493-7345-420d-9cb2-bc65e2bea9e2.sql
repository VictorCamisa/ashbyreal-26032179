
-- Passo 1: Corrigir as datas de vencimento e fechamento dos cartões
-- Azul: Venc 22, estimando fechamento dia 12
UPDATE credit_cards SET closing_day = 12, due_day = 22 WHERE name = 'Azul Itaucard';

-- Latam: Venc 04, estimando fechamento dia 27 do mês anterior
UPDATE credit_cards SET closing_day = 27, due_day = 4 WHERE name = 'Latam';

-- Santander: Venc 01, estimando fechamento dia 22 do mês anterior  
UPDATE credit_cards SET closing_day = 22, due_day = 1 WHERE name = 'Santander Smiles';

-- Mercado Pago: Venc 02, estimando fechamento dia 25 do mês anterior
UPDATE credit_cards SET closing_day = 25, due_day = 2 WHERE name = 'Mercado Pago';

-- Itaú Empresas: Venc 06, estimando fechamento dia 27 do mês anterior
UPDATE credit_cards SET closing_day = 27, due_day = 6 WHERE name = 'Itaú Empresas';

-- Passo 2: Limpar transações e faturas incorretas
DELETE FROM credit_card_transactions;
DELETE FROM credit_card_invoices;
