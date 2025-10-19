-- Adicionar campos faltantes na tabela produtos
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS preco_custo NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_lucro NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'UN',
  ADD COLUMN IF NOT EXISTS fornecedor TEXT,
  ADD COLUMN IF NOT EXISTS localizacao TEXT;

-- Criar índice para categoria
CREATE INDEX IF NOT EXISTS idx_produtos_categoria_ativo ON public.produtos(categoria, ativo);

-- Criar tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER NOT NULL,
  quantidade_nova INTEGER NOT NULL,
  responsavel TEXT NOT NULL,
  motivo TEXT,
  documento TEXT,
  valor_unitario NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela de movimentações
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para movimentações
CREATE POLICY "Authenticated users can view movimentacoes"
  ON public.movimentacoes_estoque FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert movimentacoes"
  ON public.movimentacoes_estoque FOR INSERT
  WITH CHECK (true);

-- Índices para melhor performance nas movimentações
CREATE INDEX idx_movimentacoes_produto_id ON public.movimentacoes_estoque(produto_id);
CREATE INDEX idx_movimentacoes_created_at ON public.movimentacoes_estoque(created_at DESC);
CREATE INDEX idx_movimentacoes_tipo ON public.movimentacoes_estoque(tipo);

-- Função para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION public.atualizar_estoque_produto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar o estoque do produto
  UPDATE public.produtos
  SET 
    estoque = NEW.quantidade_nova,
    updated_at = now()
  WHERE id = NEW.produto_id;
  
  RETURN NEW;
END;
$$;

-- Trigger para atualizar estoque quando há movimentação
CREATE TRIGGER trigger_atualizar_estoque
  AFTER INSERT ON public.movimentacoes_estoque
  FOR EACH ROW
  EXECUTE FUNCTION public.atualizar_estoque_produto();

-- Atualizar função de cálculo de margem
CREATE OR REPLACE FUNCTION public.calcular_margem_produto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.preco_custo > 0 THEN
    NEW.margem_lucro := ((NEW.preco - NEW.preco_custo) / NEW.preco_custo) * 100;
  ELSE
    NEW.margem_lucro := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para calcular margem automaticamente
DROP TRIGGER IF EXISTS trigger_calcular_margem ON public.produtos;
CREATE TRIGGER trigger_calcular_margem
  BEFORE INSERT OR UPDATE OF preco, preco_custo ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_margem_produto();