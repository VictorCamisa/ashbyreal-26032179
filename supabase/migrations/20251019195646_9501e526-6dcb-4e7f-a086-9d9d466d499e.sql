-- Create clientes table
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  empresa TEXT,
  cpf_cnpj TEXT,
  endereco JSONB,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('ativo', 'inativo', 'lead')),
  origem TEXT NOT NULL CHECK (origem IN ('WhatsApp', 'Facebook', 'Instagram', 'Indicação', 'Site', 'Outros')),
  ticket_medio DECIMAL(10, 2) DEFAULT 0,
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ultimo_contato TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create interacoes table
CREATE TABLE IF NOT EXISTS public.interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('ligacao', 'whatsapp', 'email', 'reuniao', 'visita', 'outros')),
  descricao TEXT NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responsavel TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_status ON public.clientes(status);
CREATE INDEX IF NOT EXISTS idx_interacoes_cliente_id ON public.interacoes(cliente_id);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clientes (allow authenticated users to manage clients)
CREATE POLICY "Authenticated users can view all clientes"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clientes"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clientes"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete clientes"
  ON public.clientes
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for interacoes
CREATE POLICY "Authenticated users can view all interacoes"
  ON public.interacoes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert interacoes"
  ON public.interacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update interacoes"
  ON public.interacoes
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete interacoes"
  ON public.interacoes
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for clientes updated_at
CREATE TRIGGER set_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();