
-- Create lojistas table for partner/reseller management
CREATE TABLE public.lojistas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  telefone TEXT NOT NULL,
  email TEXT,
  endereco JSONB,
  contato_responsavel TEXT,
  observacoes TEXT,
  status TEXT DEFAULT 'ativo',
  data_cadastro DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lojistas ENABLE ROW LEVEL SECURITY;

-- Create permissive policy
CREATE POLICY "Allow all access to lojistas"
ON public.lojistas
FOR ALL
USING (true)
WITH CHECK (true);

-- Add lojista_id to pedidos table to track sales to partners
ALTER TABLE public.pedidos ADD COLUMN lojista_id UUID REFERENCES public.lojistas(id);

-- Add lojista_id to barris table to track barrels with partners
ALTER TABLE public.barris ADD COLUMN lojista_id UUID REFERENCES public.lojistas(id);

-- Create trigger for updated_at
CREATE TRIGGER update_lojistas_updated_at
  BEFORE UPDATE ON public.lojistas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
