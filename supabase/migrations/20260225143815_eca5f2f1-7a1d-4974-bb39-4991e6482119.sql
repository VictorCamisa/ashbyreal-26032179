-- Clean Mercado Livre data for re-sync
DELETE FROM credit_card_transactions WHERE credit_card_id = 'ff07681d-888e-4624-9cf1-ce2406507a24';
DELETE FROM credit_card_invoices WHERE credit_card_id = 'ff07681d-888e-4624-9cf1-ce2406507a24';