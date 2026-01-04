-- Atualizar cartões pessoais para entidade PARTICULAR
UPDATE credit_cards 
SET entity_id = 'ec7b8cd6-b933-4fe2-bf19-1dbf8fce038a'
WHERE name IN ('Azul Itaucard', 'Latam Pass Itaú', 'Santander Smiles', 'Mercado Livre');