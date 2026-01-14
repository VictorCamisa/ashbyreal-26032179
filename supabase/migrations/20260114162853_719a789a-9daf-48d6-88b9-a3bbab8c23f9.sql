-- Adicionar campos para controle de chopp na tabela produtos
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS tipo_produto TEXT DEFAULT 'PADRAO';
-- Valores possíveis: 'PADRAO', 'CHOPP'

ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS estoque_litros NUMERIC DEFAULT 0;
-- Estoque em litros para produtos tipo CHOPP

ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS capacidade_barril INTEGER DEFAULT NULL;
-- Capacidade padrão do barril para venda (30 ou 50 litros)

-- Criar índice para consultas por tipo de produto
CREATE INDEX IF NOT EXISTS idx_produtos_tipo ON public.produtos(tipo_produto);

-- Comentários para documentação
COMMENT ON COLUMN public.produtos.tipo_produto IS 'Tipo do produto: PADRAO para produtos normais, CHOPP para produtos vendidos em litros';
COMMENT ON COLUMN public.produtos.estoque_litros IS 'Estoque disponível em litros para produtos tipo CHOPP';
COMMENT ON COLUMN public.produtos.capacidade_barril IS 'Capacidade do barril para venda (30 ou 50 litros)';