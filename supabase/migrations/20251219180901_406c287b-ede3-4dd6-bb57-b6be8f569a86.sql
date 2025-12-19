-- Limpar todas as transações de cartão para reimportação
DELETE FROM credit_card_transactions;

-- Limpar todas as faturas de cartão
DELETE FROM credit_card_invoices;