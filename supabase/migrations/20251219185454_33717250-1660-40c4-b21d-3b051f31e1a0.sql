
-- Delete all transactions for Azul card
DELETE FROM credit_card_transactions 
WHERE credit_card_id = 'b072794d-2e72-4e4a-8ec9-57cc5f1a8478';

-- Delete all invoices for Azul card
DELETE FROM credit_card_invoices 
WHERE credit_card_id = 'b072794d-2e72-4e4a-8ec9-57cc5f1a8478';

-- Delete import history for Azul card
DELETE FROM credit_card_imports 
WHERE credit_card_id = 'b072794d-2e72-4e4a-8ec9-57cc5f1a8478';
