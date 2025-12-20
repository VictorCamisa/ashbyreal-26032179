-- Marcar todas as transações anteriores a dezembro de 2025 como PAGO
UPDATE public.transactions
SET 
  status = 'PAGO',
  payment_date = due_date
WHERE 
  due_date < '2025-12-01'
  AND status != 'PAGO';