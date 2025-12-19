-- Corrigir os card_provider para os valores esperados pelo frontend
UPDATE public.credit_cards SET card_provider = 'AZUL' WHERE name = 'Azul Itaucard';
UPDATE public.credit_cards SET card_provider = 'SANTANDER_SMILES' WHERE name = 'Santander Smiles';
UPDATE public.credit_cards SET card_provider = 'ITAU_EMPRESAS' WHERE name = 'Itaú Empresas';
UPDATE public.credit_cards SET card_provider = 'MERCADO_LIVRE' WHERE name = 'Mercado Pago';
UPDATE public.credit_cards SET card_provider = 'LATAM' WHERE name = 'Latam';