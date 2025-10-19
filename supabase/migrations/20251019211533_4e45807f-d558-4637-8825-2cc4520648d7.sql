-- Criar tabela de produtos
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL DEFAULT 0,
  estoque INTEGER NOT NULL DEFAULT 0,
  categoria TEXT,
  sku TEXT UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens do pedido
CREATE TABLE public.pedido_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para produtos
CREATE POLICY "Authenticated users can view all produtos"
  ON public.produtos FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert produtos"
  ON public.produtos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update produtos"
  ON public.produtos FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete produtos"
  ON public.produtos FOR DELETE
  USING (true);

-- Políticas RLS para pedido_itens
CREATE POLICY "Authenticated users can view all pedido_itens"
  ON public.pedido_itens FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert pedido_itens"
  ON public.pedido_itens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pedido_itens"
  ON public.pedido_itens FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete pedido_itens"
  ON public.pedido_itens FOR DELETE
  USING (true);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_pedido_itens_updated_at
  BEFORE UPDATE ON public.pedido_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Índices para melhor performance
CREATE INDEX idx_pedido_itens_pedido_id ON public.pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_produto_id ON public.pedido_itens(produto_id);
CREATE INDEX idx_produtos_sku ON public.produtos(sku);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria);