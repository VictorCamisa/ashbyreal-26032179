-- Limpar transações e faturas para reimportar
DELETE FROM public.credit_card_transactions;
DELETE FROM public.credit_card_invoices;