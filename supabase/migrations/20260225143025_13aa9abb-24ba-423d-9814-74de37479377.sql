-- Fix Mercado Livre card: closing_day=26, due_day=3
UPDATE credit_cards SET closing_day = 26, due_day = 3 WHERE id = 'ff07681d-888e-4624-9cf1-ce2406507a24';

-- Delete existing transactions and invoices to re-sync with correct competencia
DELETE FROM credit_card_transactions WHERE credit_card_id = 'ff07681d-888e-4624-9cf1-ce2406507a24';
DELETE FROM credit_card_invoices WHERE credit_card_id = 'ff07681d-888e-4624-9cf1-ce2406507a24';