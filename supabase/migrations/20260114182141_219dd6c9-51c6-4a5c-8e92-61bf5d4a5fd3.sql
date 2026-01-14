-- Adicionar 20 unidades de estoque para cada produto CHOPP
UPDATE produtos 
SET estoque = 20, estoque_litros = capacidade_barril * 20
WHERE tipo_produto = 'CHOPP';