
-- Delete existing transactions for Azul December 2025 invoice
DELETE FROM credit_card_transactions 
WHERE invoice_id = 'eb0ad7b7-f007-49dd-a63e-91df585e58b3';

-- Delete the invoice itself
DELETE FROM credit_card_invoices 
WHERE id = 'eb0ad7b7-f007-49dd-a63e-91df585e58b3';
