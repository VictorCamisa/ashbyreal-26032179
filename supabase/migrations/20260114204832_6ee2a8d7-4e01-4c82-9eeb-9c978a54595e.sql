-- Deletar os produtos agrupados incorretamente
DELETE FROM produtos WHERE nome LIKE 'IPA/Weiss/Ale%';
DELETE FROM produtos WHERE nome LIKE 'Vinho Tinto e Branco%';

-- Inserir cada sabor separadamente com nomes corretos
INSERT INTO produtos (nome, categoria, tipo_produto, preco, capacidade_barril, sku, ativo, estoque, estoque_litros, estoque_minimo, unidade_medida)
VALUES
  -- IPA
  ('Chopp IPA 30 LITROS', 'Chopp', 'CHOPP', 590.00, 30, 'CHOPP-IPA-30', true, 0, 0, 0, 'litros'),
  ('Chopp IPA 50 LITROS', 'Chopp', 'CHOPP', 950.00, 50, 'CHOPP-IPA-50', true, 0, 0, 0, 'litros'),
  
  -- Weiss
  ('Chopp Weiss 30 LITROS', 'Chopp', 'CHOPP', 590.00, 30, 'CHOPP-WEISS-30', true, 0, 0, 0, 'litros'),
  ('Chopp Weiss 50 LITROS', 'Chopp', 'CHOPP', 950.00, 50, 'CHOPP-WEISS-50', true, 0, 0, 0, 'litros'),
  
  -- Ale
  ('Chopp Ale 30 LITROS', 'Chopp', 'CHOPP', 590.00, 30, 'CHOPP-ALE-30', true, 0, 0, 0, 'litros'),
  ('Chopp Ale 50 LITROS', 'Chopp', 'CHOPP', 950.00, 50, 'CHOPP-ALE-50', true, 0, 0, 0, 'litros'),
  
  -- Vinho Tinto (separado)
  ('Chopp de Vinho Tinto 30 LITROS', 'Chopp', 'CHOPP', 590.00, 30, 'CHOPP-VINHO-TINTO-30', true, 0, 0, 0, 'litros'),
  ('Chopp de Vinho Tinto 50 LITROS', 'Chopp', 'CHOPP', 900.00, 50, 'CHOPP-VINHO-TINTO-50', true, 0, 0, 0, 'litros'),
  
  -- Vinho Branco (separado)
  ('Chopp de Vinho Branco 30 LITROS', 'Chopp', 'CHOPP', 590.00, 30, 'CHOPP-VINHO-BRANCO-30', true, 0, 0, 0, 'litros'),
  ('Chopp de Vinho Branco 50 LITROS', 'Chopp', 'CHOPP', 900.00, 50, 'CHOPP-VINHO-BRANCO-50', true, 0, 0, 0, 'litros');

-- Atualizar os nomes dos outros chopps existentes para padronizar com "LITROS"
UPDATE produtos 
SET nome = REPLACE(nome, '30L', '30 LITROS'),
    unidade_medida = 'litros'
WHERE nome LIKE '%30L' AND categoria = 'Chopp';

UPDATE produtos 
SET nome = REPLACE(nome, '50L', '50 LITROS'),
    unidade_medida = 'litros'
WHERE nome LIKE '%50L' AND categoria = 'Chopp';

-- Padronizar nomes (Escuro, Pilsen, Puro Malte)
UPDATE produtos SET nome = 'Chopp Escuro 30 LITROS' WHERE nome LIKE 'Escuro%30%';
UPDATE produtos SET nome = 'Chopp Escuro 50 LITROS' WHERE nome LIKE 'Escuro%50%';
UPDATE produtos SET nome = 'Chopp Pilsen 30 LITROS' WHERE nome LIKE 'Pilsen%30%';
UPDATE produtos SET nome = 'Chopp Pilsen 50 LITROS' WHERE nome LIKE 'Pilsen%50%';
UPDATE produtos SET nome = 'Chopp Puro Malte 30 LITROS' WHERE nome LIKE 'Puro Malte%30%';
UPDATE produtos SET nome = 'Chopp Puro Malte 50 LITROS' WHERE nome LIKE 'Puro Malte%50%';