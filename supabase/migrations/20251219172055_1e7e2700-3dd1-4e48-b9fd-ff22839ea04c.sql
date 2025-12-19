-- Limpar transações para reimportar com descrições limpas
DELETE FROM public.credit_card_transactions;
DELETE FROM public.credit_card_invoices;