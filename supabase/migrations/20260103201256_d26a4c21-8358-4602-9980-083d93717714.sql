-- =============================================
-- FASE 1: Limpar e recriar categorias/subcategorias
-- =============================================

-- Primeiro, remover subcategorias órfãs
DELETE FROM subcategories WHERE category_id NOT IN (SELECT id FROM categories);

-- Desativar categorias antigas (não deletar para manter histórico)
UPDATE categories SET is_active = false WHERE is_active = true;
UPDATE subcategories SET is_active = false WHERE is_active = true;

-- =============================================
-- CATEGORIAS DE RECEITA
-- =============================================

-- VENDA DE CHOPP
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('VENDA DE CHOPP', 'RECEITA', 'VARIAVEL', 'Vendas de chopp para clientes', true, '#22c55e')
ON CONFLICT DO NOTHING;

-- EVENTOS
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('EVENTOS', 'RECEITA', 'VARIAVEL', 'Receitas de eventos especiais', true, '#3b82f6')
ON CONFLICT DO NOTHING;

-- =============================================
-- CATEGORIAS DE DESPESA
-- =============================================

-- DESPESAS FIXAS
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('DESPESAS FIXAS', 'DESPESA', 'FIXO', 'Despesas fixas mensais da empresa', true, '#ef4444')
ON CONFLICT DO NOTHING;

-- GASTOS VARIÁVEIS GERAIS
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('GASTOS VARIÁVEIS GERAIS', 'DESPESA', 'VARIAVEL', 'Gastos variáveis diversos', true, '#f97316')
ON CONFLICT DO NOTHING;

-- GASTOS VARIÁVEIS ASHBY
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('GASTOS VARIÁVEIS ASHBY', 'DESPESA', 'VARIAVEL', 'Gastos relacionados ao Ashby/Chopp', true, '#eab308')
ON CONFLICT DO NOTHING;

-- PESSOAS
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('PESSOAS', 'DESPESA', 'FIXO', 'Salários, freelancers e pagamentos a pessoas', true, '#8b5cf6')
ON CONFLICT DO NOTHING;

-- IMPOSTOS
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('IMPOSTOS', 'DESPESA', 'FIXO', 'Impostos e tributos', true, '#ec4899')
ON CONFLICT DO NOTHING;

-- FINANCIAMENTO
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('FINANCIAMENTO', 'DESPESA', 'FIXO', 'Empréstimos, consórcios e financiamentos', true, '#06b6d4')
ON CONFLICT DO NOTHING;

-- CARTÕES DE CRÉDITO
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('CARTÕES DE CRÉDITO', 'DESPESA', 'VARIAVEL', 'Faturas de cartões de crédito', true, '#6366f1')
ON CONFLICT DO NOTHING;

-- GASTOS PARTICULARES
INSERT INTO categories (name, type, category_group, description, is_active, color)
VALUES ('GASTOS PARTICULARES', 'DESPESA', 'VARIAVEL', 'Despesas pessoais do proprietário', true, '#a855f7')
ON CONFLICT DO NOTHING;

-- =============================================
-- SUBCATEGORIAS DE RECEITA
-- =============================================

-- Subcategorias de VENDA DE CHOPP
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'RESTAURANTES PDV', id, true FROM categories WHERE name = 'VENDA DE CHOPP' AND type = 'RECEITA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'CLIENTE FINAL', id, true FROM categories WHERE name = 'VENDA DE CHOPP' AND type = 'RECEITA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de EVENTOS
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'FESTA QUIRIRIM 2025', id, true FROM categories WHERE name = 'EVENTOS' AND type = 'RECEITA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'FESTA JUNINA APAE', id, true FROM categories WHERE name = 'EVENTOS' AND type = 'RECEITA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'EVENTO GERAL', id, true FROM categories WHERE name = 'EVENTOS' AND type = 'RECEITA' AND is_active = true
ON CONFLICT DO NOTHING;

-- =============================================
-- SUBCATEGORIAS DE DESPESA
-- =============================================

-- Subcategorias de DESPESAS FIXAS
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'ALUGUEL', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'ENERGIA EDP', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'ÁGUA SABESP', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'MDR - CONTABILIDADE', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'SISTEMA - FABIO JARDIM', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'SANTA CASA SAÚDE', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'TELEFONE/INTERNET', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'SEGURO', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'OUTROS FIXOS', id, true FROM categories WHERE name = 'DESPESAS FIXAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de GASTOS VARIÁVEIS GERAIS
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'INSUMOS CO2', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS GERAIS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'ATIVO LOJA', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS GERAIS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'ALUGUEL CO2 e N2', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS GERAIS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'MANUTENÇÃO', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS GERAIS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'OUTROS VARIÁVEIS', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS GERAIS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de GASTOS VARIÁVEIS ASHBY
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'CHOPP', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS ASHBY' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'CHOPP NF', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS ASHBY' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'MATERIAIS ASHBY', id, true FROM categories WHERE name = 'GASTOS VARIÁVEIS ASHBY' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de PESSOAS
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'SALÁRIO DOUGLAS', id, true FROM categories WHERE name = 'PESSOAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'ADIANTAMENTO DOUGLAS', id, true FROM categories WHERE name = 'PESSOAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'EXTRA', id, true FROM categories WHERE name = 'PESSOAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'FREE LANCER', id, true FROM categories WHERE name = 'PESSOAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'OUTROS PESSOAS', id, true FROM categories WHERE name = 'PESSOAS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de IMPOSTOS
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'DARF', id, true FROM categories WHERE name = 'IMPOSTOS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'SIMPLES NACIONAL', id, true FROM categories WHERE name = 'IMPOSTOS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'DAS de PARCSN', id, true FROM categories WHERE name = 'IMPOSTOS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'FGTS', id, true FROM categories WHERE name = 'IMPOSTOS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'SIND. TRANSPORTES RODOVIÁRIOS', id, true FROM categories WHERE name = 'IMPOSTOS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'OUTROS IMPOSTOS', id, true FROM categories WHERE name = 'IMPOSTOS' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de FINANCIAMENTO
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'FINANCIAMENTO GERAL', id, true FROM categories WHERE name = 'FINANCIAMENTO' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'CONSÓRCIO', id, true FROM categories WHERE name = 'FINANCIAMENTO' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'EMPRÉSTIMO', id, true FROM categories WHERE name = 'FINANCIAMENTO' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de CARTÕES DE CRÉDITO
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'CARTÃO', id, true FROM categories WHERE name = 'CARTÕES DE CRÉDITO' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'FATURA CARTÃO', id, true FROM categories WHERE name = 'CARTÕES DE CRÉDITO' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- Subcategorias de GASTOS PARTICULARES
INSERT INTO subcategories (name, category_id, is_active)
SELECT 'IMPOSTO PARTICULAR', id, true FROM categories WHERE name = 'GASTOS PARTICULARES' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'CLARO MOVEL', id, true FROM categories WHERE name = 'GASTOS PARTICULARES' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

INSERT INTO subcategories (name, category_id, is_active)
SELECT 'OUTROS PARTICULARES', id, true FROM categories WHERE name = 'GASTOS PARTICULARES' AND type = 'DESPESA' AND is_active = true
ON CONFLICT DO NOTHING;

-- =============================================
-- FASE 2: Criar/Verificar Contas Bancárias
-- =============================================

-- Obter ID da entidade LOJA
INSERT INTO accounts (name, entity_id, type, bank_name, is_active)
SELECT 'BANCO ITAÚ EMPRESAS', e.id, 'CORRENTE', 'Itaú', true
FROM entities e WHERE e.type = 'LOJA' AND e.is_active = true
ON CONFLICT DO NOTHING;

-- Obter ID da entidade PARTICULAR
INSERT INTO accounts (name, entity_id, type, bank_name, is_active)
SELECT 'ITAU PERSONALITE', e.id, 'CORRENTE', 'Itaú', true
FROM entities e WHERE e.type = 'PARTICULAR' AND e.is_active = true
ON CONFLICT DO NOTHING;