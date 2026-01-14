-- Create enum for barril location
CREATE TYPE public.barril_localizacao AS ENUM ('LOJA', 'CLIENTE');

-- Create enum for barril content status
CREATE TYPE public.barril_status_conteudo AS ENUM ('CHEIO', 'VAZIO');

-- Create enum for movement type
CREATE TYPE public.barril_tipo_movimento AS ENUM ('SAIDA', 'RETORNO');

-- Create barris table
CREATE TABLE public.barris (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  capacidade NUMERIC NOT NULL DEFAULT 30,
  localizacao public.barril_localizacao NOT NULL DEFAULT 'LOJA',
  status_conteudo public.barril_status_conteudo NOT NULL DEFAULT 'VAZIO',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  data_ultima_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create barril_movimentacoes table
CREATE TABLE public.barril_movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barril_id UUID NOT NULL REFERENCES public.barris(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  tipo_movimento public.barril_tipo_movimento NOT NULL,
  status_conteudo public.barril_status_conteudo NOT NULL,
  localizacao_anterior public.barril_localizacao,
  localizacao_nova public.barril_localizacao,
  data_movimento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.barris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barril_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for barris
CREATE POLICY "Authenticated users can manage barris"
ON public.barris
FOR ALL
USING (true)
WITH CHECK (true);

-- Create RLS policies for barril_movimentacoes
CREATE POLICY "Authenticated users can manage barril_movimentacoes"
ON public.barril_movimentacoes
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_barris_updated_at
BEFORE UPDATE ON public.barris
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed 130 barrels - 65 of 30L and 65 of 50L
INSERT INTO public.barris (codigo, capacidade, localizacao, status_conteudo)
SELECT 
  'B' || LPAD(n::text, 3, '0'),
  CASE WHEN n <= 65 THEN 30 ELSE 50 END,
  'LOJA',
  'VAZIO'
FROM generate_series(1, 130) AS n;