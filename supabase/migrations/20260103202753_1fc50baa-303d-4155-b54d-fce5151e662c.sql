-- Mark all transactions as PAGO and set payment_date
UPDATE transactions 
SET 
  status = 'PAGO',
  payment_date = COALESCE(payment_date, due_date)
WHERE status != 'PAGO';