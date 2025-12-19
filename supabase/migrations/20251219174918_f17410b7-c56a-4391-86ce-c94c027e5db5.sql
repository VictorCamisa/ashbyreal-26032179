-- Marcar todas as faturas anteriores a dezembro/2025 como PAGA
UPDATE credit_card_invoices 
SET status = 'PAGA' 
WHERE competencia < '2025-12-01';