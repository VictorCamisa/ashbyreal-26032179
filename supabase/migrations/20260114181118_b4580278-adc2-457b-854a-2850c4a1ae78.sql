
-- Inserir produtos de Chopp
INSERT INTO produtos (nome, categoria, preco, preco_custo, estoque, estoque_minimo, estoque_litros, tipo_produto, capacidade_barril, unidade_medida, fornecedor, sku, ativo)
VALUES 
  -- PILSEN
  ('Pilsen 50L', 'Chopp', 690, 0, 0, 0, 0, 'CHOPP', 50, 'L', 'Ashby', 'CHOPP-PILSEN-50', true),
  ('Pilsen 30L', 'Chopp', 440, 0, 0, 0, 0, 'CHOPP', 30, 'L', 'Ashby', 'CHOPP-PILSEN-30', true),
  
  -- ESCURO
  ('Escuro 50L', 'Chopp', 720, 0, 0, 0, 0, 'CHOPP', 50, 'L', 'Ashby', 'CHOPP-ESCURO-50', true),
  ('Escuro 30L', 'Chopp', 460, 0, 0, 0, 0, 'CHOPP', 30, 'L', 'Ashby', 'CHOPP-ESCURO-30', true),
  
  -- VINHO TINTO E BRANCO
  ('Vinho Tinto e Branco 50L', 'Chopp', 900, 0, 0, 0, 0, 'CHOPP', 50, 'L', 'Ashby', 'CHOPP-VINHO-50', true),
  ('Vinho Tinto e Branco 30L', 'Chopp', 590, 0, 0, 0, 0, 'CHOPP', 30, 'L', 'Ashby', 'CHOPP-VINHO-30', true),
  
  -- IPA/WEISS/ALE
  ('IPA/Weiss/Ale 50L', 'Chopp', 950, 0, 0, 0, 0, 'CHOPP', 50, 'L', 'Ashby', 'CHOPP-IPA-50', true),
  ('IPA/Weiss/Ale 30L', 'Chopp', 590, 0, 0, 0, 0, 'CHOPP', 30, 'L', 'Ashby', 'CHOPP-IPA-30', true),
  
  -- PURO MALTE
  ('Puro Malte 50L', 'Chopp', 740, 0, 0, 0, 0, 'CHOPP', 50, 'L', 'Ashby', 'CHOPP-PUROMALTE-50', true),
  ('Puro Malte 30L', 'Chopp', 460, 0, 0, 0, 0, 'CHOPP', 30, 'L', 'Ashby', 'CHOPP-PUROMALTE-30', true);
