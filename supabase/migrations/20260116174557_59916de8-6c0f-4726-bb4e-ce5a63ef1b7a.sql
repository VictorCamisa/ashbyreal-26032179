-- Delete transactions linked to January 2026 Latam Pass invoice
DELETE FROM credit_card_transactions 
WHERE invoice_id = '9afa0a3d-71dd-410a-b208-08fe5121a779';

-- Delete the invoice itself
DELETE FROM credit_card_invoices 
WHERE id = '9afa0a3d-71dd-410a-b208-08fe5121a779';