-- Delete movimentacoes referencing these barrels first
DELETE FROM barril_movimentacoes WHERE barril_id IN (
  SELECT id FROM barris WHERE codigo LIKE 'ASH-30-%' AND localizacao = 'LOJA' AND status_conteudo = 'VAZIO'
);
DELETE FROM barril_movimentacoes WHERE barril_id IN (
  SELECT id FROM barris WHERE codigo LIKE 'ASH-50-%' AND localizacao = 'LOJA' AND status_conteudo = 'VAZIO'
);

-- Delete the extra empty barrels
DELETE FROM barris WHERE codigo LIKE 'ASH-30-%' AND localizacao = 'LOJA' AND status_conteudo = 'VAZIO';
DELETE FROM barris WHERE codigo LIKE 'ASH-50-%' AND localizacao = 'LOJA' AND status_conteudo = 'VAZIO';