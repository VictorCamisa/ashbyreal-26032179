-- Inserir entities (LOJA e PARTICULAR)
INSERT INTO entities (name, type, is_active) VALUES
  ('Loja', 'LOJA', true),
  ('Particular', 'PARTICULAR', true)
ON CONFLICT DO NOTHING;

-- Inserir categorias de DESPESA
INSERT INTO categories (name, type, "group") VALUES
  ('Aluguel', 'DESPESA', 'FIXA'),
  ('Água', 'DESPESA', 'FIXA'),
  ('Energia', 'DESPESA', 'FIXA'),
  ('Internet', 'DESPESA', 'FIXA'),
  ('Telefone', 'DESPESA', 'FIXA'),
  ('Salários', 'DESPESA', 'PESSOA'),
  ('Funcionários', 'DESPESA', 'PESSOA'),
  ('Fornecedores', 'DESPESA', 'VARIAVEL'),
  ('Marketing', 'DESPESA', 'VARIAVEL'),
  ('Manutenção', 'DESPESA', 'VARIAVEL'),
  ('Materiais', 'DESPESA', 'VARIAVEL'),
  ('Combustível', 'DESPESA', 'VARIAVEL'),
  ('Alimentação', 'DESPESA', 'PARTICULAR'),
  ('Transporte', 'DESPESA', 'PARTICULAR'),
  ('Lazer', 'DESPESA', 'PARTICULAR'),
  ('Saúde', 'DESPESA', 'PARTICULAR'),
  ('Educação', 'DESPESA', 'PARTICULAR'),
  ('IPTU', 'DESPESA', 'IMPOSTO'),
  ('IPVA', 'DESPESA', 'IMPOSTO'),
  ('Impostos Federais', 'DESPESA', 'IMPOSTO'),
  ('Ashby', 'DESPESA', 'ASHBY'),
  ('Outras Despesas', 'DESPESA', 'GERAL')
ON CONFLICT DO NOTHING;

-- Inserir categorias de RECEITA
INSERT INTO categories (name, type, "group") VALUES
  ('Vendas', 'RECEITA', 'GERAL'),
  ('Serviços', 'RECEITA', 'GERAL'),
  ('Comissões', 'RECEITA', 'GERAL'),
  ('Outras Receitas', 'RECEITA', 'GERAL')
ON CONFLICT DO NOTHING;

-- Inserir contas para a LOJA
INSERT INTO accounts (name, type, entity_id, is_active, is_default)
SELECT 
  'Caixa Loja',
  'CAIXA',
  e.id,
  true,
  true
FROM entities e
WHERE e.type = 'LOJA'
ON CONFLICT DO NOTHING;

INSERT INTO accounts (name, type, entity_id, bank_name, is_active, is_default)
SELECT 
  'Conta Corrente Loja',
  'BANCO',
  e.id,
  'Banco do Brasil',
  true,
  false
FROM entities e
WHERE e.type = 'LOJA'
ON CONFLICT DO NOTHING;

-- Inserir contas para PARTICULAR
INSERT INTO accounts (name, type, entity_id, is_active, is_default)
SELECT 
  'Carteira',
  'CAIXA',
  e.id,
  true,
  true
FROM entities e
WHERE e.type = 'PARTICULAR'
ON CONFLICT DO NOTHING;

INSERT INTO accounts (name, type, entity_id, bank_name, is_active, is_default)
SELECT 
  'Conta Corrente Pessoal',
  'BANCO',
  e.id,
  'Banco do Brasil',
  true,
  false
FROM entities e
WHERE e.type = 'PARTICULAR'
ON CONFLICT DO NOTHING;