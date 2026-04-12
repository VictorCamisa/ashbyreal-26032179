
-- ============================================
-- 1. FIX CLIENT STATUSES (lead → cliente)
-- ============================================
UPDATE clientes SET status = 'cliente' WHERE id IN (
  'd101b8e4-829a-4473-8fe4-02058bbf7eac', -- DOUGLAS ASHBY
  '83abde72-16f2-4516-aac3-0e862185a68e', -- BROWE APARECIDA
  'eb2cbc32-542f-49dc-8ebf-733a3d32aead', -- 100% SELF APARECIDA
  '01f6719d-04bd-4a4f-992b-22a96da3989d', -- DON JUAN
  '2e8f18a8-d64e-401e-a477-2dbe178021e7', -- QUIOSQUE GUERRA
  '2f99a809-799a-4fc2-a8b1-8e67398cad89', -- QUIOSQUE ESQUINA
  '2ea1c6ab-1188-44a9-b887-3f81d4804125', -- QUIOSQUE AMARELO
  '4caf8aef-732f-409d-851b-b6104ada24ac', -- QUIOSQUE PARQUE
  '1e040376-65a6-40ad-aeaf-5f610874b42c', -- BROWE CAPIVARI
  '03c0c640-f344-41ff-96e3-d0a6e9d707a1', -- AVÓS CERVEJARIA
  '21f83b7e-e3e9-4a6b-b558-a52abede17f3'  -- DANIEL PDV
);

-- ============================================
-- 2. DEDUPLICATE CLIENTS - Migrate data, then delete dupes
-- ============================================

-- SHAZZAN: move barris from "SHAZZAN" (ac5e5f9f) → keep "SHAZZAN ESFIRRARIA" (82fcc57d) for client, but barris stay on ac5e5f9f since lojista is e3dcdb1f
-- Actually barris linked to SHAZZAN (ac5e5f9f) should move to the real SHAZZAN ESFIRRARIA client (82fcc57d)
UPDATE barris SET cliente_id = '82fcc57d-6ccc-4ce7-9cc5-317b16c5e895' WHERE cliente_id = 'ac5e5f9f-c9d6-45bb-bd93-e5b62434c2c9';
UPDATE pedidos SET cliente_id = '82fcc57d-6ccc-4ce7-9cc5-317b16c5e895' WHERE cliente_id = 'ac5e5f9f-c9d6-45bb-bd93-e5b62434c2c9';
UPDATE barril_movimentacoes SET cliente_id = '82fcc57d-6ccc-4ce7-9cc5-317b16c5e895' WHERE cliente_id = 'ac5e5f9f-c9d6-45bb-bd93-e5b62434c2c9';
DELETE FROM clientes WHERE id = 'ac5e5f9f-c9d6-45bb-bd93-e5b62434c2c9';

-- CHOPP IN KOMBI dupes: merge into CHOPP IN KOMBI - CABRAL (30ff363d)
UPDATE pedidos SET cliente_id = '30ff363d-7cf2-415c-82e0-b4d64552d27b' WHERE cliente_id IN ('5ddf2115-3e20-4441-8866-690c97fea4c5','70a1eead-a93d-4516-a2e4-4def7286a425','a585ecf9-e031-4975-945c-514b06e78de6');
UPDATE barris SET cliente_id = '30ff363d-7cf2-415c-82e0-b4d64552d27b' WHERE cliente_id IN ('5ddf2115-3e20-4441-8866-690c97fea4c5','70a1eead-a93d-4516-a2e4-4def7286a425','a585ecf9-e031-4975-945c-514b06e78de6');
UPDATE barril_movimentacoes SET cliente_id = '30ff363d-7cf2-415c-82e0-b4d64552d27b' WHERE cliente_id IN ('5ddf2115-3e20-4441-8866-690c97fea4c5','70a1eead-a93d-4516-a2e4-4def7286a425','a585ecf9-e031-4975-945c-514b06e78de6');
UPDATE interacoes SET cliente_id = '30ff363d-7cf2-415c-82e0-b4d64552d27b' WHERE cliente_id IN ('5ddf2115-3e20-4441-8866-690c97fea4c5','70a1eead-a93d-4516-a2e4-4def7286a425','a585ecf9-e031-4975-945c-514b06e78de6');
-- Rename to standard name
UPDATE clientes SET nome = 'CHOPP IN KOMBI' WHERE id = '30ff363d-7cf2-415c-82e0-b4d64552d27b';
DELETE FROM clientes WHERE id IN ('5ddf2115-3e20-4441-8866-690c97fea4c5','70a1eead-a93d-4516-a2e4-4def7286a425','a585ecf9-e031-4975-945c-514b06e78de6');

-- ESPETINHO F.C (dupe, no orders): delete
DELETE FROM clientes WHERE id = '63d502a4-8520-4466-b3ed-4db703ebd2da';
-- Rename main to match planilha
UPDATE clientes SET nome = 'ESPETINHO F.C' WHERE id = 'bba3e362-3f2c-4ebe-abeb-e4d422a6d3e9';
-- Move barris from FELIPE ESPETINHO to ESPETINHO F.C
UPDATE barris SET cliente_id = 'bba3e362-3f2c-4ebe-abeb-e4d422a6d3e9' WHERE cliente_id = '7b47b25c-9263-4617-aac4-0d0da1b3d906';
UPDATE pedidos SET cliente_id = 'bba3e362-3f2c-4ebe-abeb-e4d422a6d3e9' WHERE cliente_id = '7b47b25c-9263-4617-aac4-0d0da1b3d906';
UPDATE barril_movimentacoes SET cliente_id = 'bba3e362-3f2c-4ebe-abeb-e4d422a6d3e9' WHERE cliente_id = '7b47b25c-9263-4617-aac4-0d0da1b3d906';
-- Delete FELIPE ESPETINHO
DELETE FROM clientes WHERE id = '7b47b25c-9263-4617-aac4-0d0da1b3d906';

-- FILE MIAU (dupe with barrels): move barrels to FILÉ MIAU (765d4e8e)
UPDATE barris SET cliente_id = '765d4e8e-2a2a-40d7-ac1f-bb15175ee091' WHERE cliente_id = '6409ec75-1402-481d-a778-d1bc386a01fd';
UPDATE barril_movimentacoes SET cliente_id = '765d4e8e-2a2a-40d7-ac1f-bb15175ee091' WHERE cliente_id = '6409ec75-1402-481d-a778-d1bc386a01fd';
DELETE FROM clientes WHERE id = '6409ec75-1402-481d-a778-d1bc386a01fd';

-- DON JUAN dupes: merge into DON JUAN (01f6719d) which has barrels
UPDATE pedidos SET cliente_id = '01f6719d-04bd-4a4f-992b-22a96da3989d' WHERE cliente_id IN ('027204c6-eb27-4d2d-8336-d6d63298ae66','311e6813-f79e-48e5-8ea9-18298c7371ed','0fe90116-3ad9-4ef6-98e0-9f0d716c3683');
UPDATE barril_movimentacoes SET cliente_id = '01f6719d-04bd-4a4f-992b-22a96da3989d' WHERE cliente_id IN ('027204c6-eb27-4d2d-8336-d6d63298ae66','311e6813-f79e-48e5-8ea9-18298c7371ed','0fe90116-3ad9-4ef6-98e0-9f0d716c3683');
UPDATE interacoes SET cliente_id = '01f6719d-04bd-4a4f-992b-22a96da3989d' WHERE cliente_id IN ('027204c6-eb27-4d2d-8336-d6d63298ae66','311e6813-f79e-48e5-8ea9-18298c7371ed','0fe90116-3ad9-4ef6-98e0-9f0d716c3683');
DELETE FROM clientes WHERE id IN ('027204c6-eb27-4d2d-8336-d6d63298ae66','311e6813-f79e-48e5-8ea9-18298c7371ed','0fe90116-3ad9-4ef6-98e0-9f0d716c3683');

-- 100% SELF: merge FELIPE 100% SELF (0ed30666, 11 pedidos) into 100% SELF APARECIDA (eb2cbc32, has barrels)
UPDATE pedidos SET cliente_id = 'eb2cbc32-542f-49dc-8ebf-733a3d32aead' WHERE cliente_id = '0ed30666-8781-49ff-9cbc-346fddc22f30';
UPDATE barril_movimentacoes SET cliente_id = 'eb2cbc32-542f-49dc-8ebf-733a3d32aead' WHERE cliente_id = '0ed30666-8781-49ff-9cbc-346fddc22f30';
UPDATE interacoes SET cliente_id = 'eb2cbc32-542f-49dc-8ebf-733a3d32aead' WHERE cliente_id = '0ed30666-8781-49ff-9cbc-346fddc22f30';
-- Also merge 100% SELF (32a836ff)
UPDATE pedidos SET cliente_id = 'eb2cbc32-542f-49dc-8ebf-733a3d32aead' WHERE cliente_id = '32a836ff-bc16-4b43-97b4-4a734a2a5d28';
UPDATE barril_movimentacoes SET cliente_id = 'eb2cbc32-542f-49dc-8ebf-733a3d32aead' WHERE cliente_id = '32a836ff-bc16-4b43-97b4-4a734a2a5d28';
DELETE FROM clientes WHERE id IN ('0ed30666-8781-49ff-9cbc-346fddc22f30','32a836ff-bc16-4b43-97b4-4a734a2a5d28');

-- ============================================
-- 3. ADD MISSING BARRELS
-- ============================================

-- QUIOSQUE AMARELO: 2x50L (planilha says 2, system has 0)
INSERT INTO barris (codigo, capacidade, localizacao, status_conteudo, cliente_id) VALUES
  ('ASH-50-0120', 50, 'CLIENTE', 'CHEIO', '2ea1c6ab-1188-44a9-b887-3f81d4804125'),
  ('ASH-50-0121', 50, 'CLIENTE', 'CHEIO', '2ea1c6ab-1188-44a9-b887-3f81d4804125');

-- QUIOSQUE PARQUE: 4x50L (planilha says 4, system has 0)
INSERT INTO barris (codigo, capacidade, localizacao, status_conteudo, cliente_id) VALUES
  ('ASH-50-0122', 50, 'CLIENTE', 'CHEIO', '4caf8aef-732f-409d-851b-b6104ada24ac'),
  ('ASH-50-0123', 50, 'CLIENTE', 'CHEIO', '4caf8aef-732f-409d-851b-b6104ada24ac'),
  ('ASH-50-0124', 50, 'CLIENTE', 'CHEIO', '4caf8aef-732f-409d-851b-b6104ada24ac'),
  ('ASH-50-0125', 50, 'CLIENTE', 'CHEIO', '4caf8aef-732f-409d-851b-b6104ada24ac');

-- DOUGLAS ASHBY: faltam 2x30L
INSERT INTO barris (codigo, capacidade, localizacao, status_conteudo, cliente_id) VALUES
  ('ASH-30-0120', 30, 'CLIENTE', 'CHEIO', 'd101b8e4-829a-4473-8fe4-02058bbf7eac'),
  ('ASH-30-0121', 30, 'CLIENTE', 'CHEIO', 'd101b8e4-829a-4473-8fe4-02058bbf7eac');

-- BROWE CAPIVARI: faltam 2x50L (planilha=12, sistema=10)
INSERT INTO barris (codigo, capacidade, localizacao, status_conteudo, cliente_id) VALUES
  ('DTV-50-0050', 50, 'CLIENTE', 'CHEIO', '1e040376-65a6-40ad-aeaf-5f610874b42c'),
  ('DTV-50-0051', 50, 'CLIENTE', 'CHEIO', '1e040376-65a6-40ad-aeaf-5f610874b42c');

-- ============================================
-- 4. REGISTER LOJISTAS (B2B restaurants)
-- ============================================
INSERT INTO lojistas (nome, nome_fantasia, telefone, status) VALUES
  ('DOUGLAS ASHBY', 'DOUGLAS ASHBY', '0000000000', 'ativo'),
  ('FILÉ MIAU', 'FILÉ MIAU', '0000000000', 'ativo'),
  ('ESPETINHO F.C', 'ESPETINHO F.C', '0000000000', 'ativo'),
  ('BROWE APARECIDA', 'BROWE APARECIDA', '0000000000', 'ativo'),
  ('100% SELF APARECIDA', '100% SELF APARECIDA', '0000000000', 'ativo'),
  ('DON JUAN', 'DON JUAN', '0000000000', 'ativo'),
  ('QUIOSQUE GUERRA', 'QUIOSQUE GUERRA', '0000000000', 'ativo'),
  ('QUIOSQUE ESQUINA', 'QUIOSQUE ESQUINA', '0000000000', 'ativo'),
  ('QUIOSQUE AMARELO', 'QUIOSQUE AMARELO', '0000000000', 'ativo'),
  ('QUIOSQUE PARQUE', 'QUIOSQUE PARQUE', '0000000000', 'ativo'),
  ('BROWE CAPIVARI', 'BROWE CAPIVARI', '0000000000', 'ativo'),
  ('AVÓS CERVEJARIA', 'AVÓS CERVEJARIA', '0000000000', 'ativo'),
  ('DANIEL PDV', 'DANIEL PDV', '0000000000', 'ativo')
ON CONFLICT DO NOTHING;
