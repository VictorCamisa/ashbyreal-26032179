-- Create leads table for CRM
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  origem TEXT NOT NULL CHECK (origem IN ('WhatsApp', 'Facebook', 'Instagram', 'Indicação', 'Site', 'Outros')),
  status TEXT NOT NULL DEFAULT 'novo_lead' CHECK (status IN ('novo_lead', 'qualificado', 'negociacao', 'fechado', 'perdido')),
  valor_estimado DECIMAL(10, 2) DEFAULT 0,
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  observacoes TEXT,
  responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create campanhas table
CREATE TABLE IF NOT EXISTS public.campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data TIMESTAMP WITH TIME ZONE DEFAULT now(),
  publico_alvo INTEGER DEFAULT 0,
  mensagens_enviadas INTEGER DEFAULT 0,
  mensagens_entregues INTEGER DEFAULT 0,
  mensagens_lidas INTEGER DEFAULT 0,
  respostas INTEGER DEFAULT 0,
  taxa_resposta DECIMAL(5, 2) DEFAULT 0,
  conversoes INTEGER DEFAULT 0,
  taxa_conversao DECIMAL(5, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'agendada' CHECK (status IN ('agendada', 'em_andamento', 'concluida', 'cancelada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create mensagens_whatsapp table
CREATE TABLE IF NOT EXISTS public.mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome_cliente TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enviada' CHECK (status IN ('enviada', 'entregue', 'lida', 'respondida', 'erro')),
  data_hora TIMESTAMP WITH TIME ZONE DEFAULT now(),
  campanha_id UUID REFERENCES public.campanhas(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_origem ON public.leads(origem);
CREATE INDEX IF NOT EXISTS idx_mensagens_cliente_id ON public.mensagens_whatsapp(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_campanha_id ON public.mensagens_whatsapp(campanha_id);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Authenticated users can view all leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert leads"
  ON public.leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete leads"
  ON public.leads
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for campanhas
CREATE POLICY "Authenticated users can view all campanhas"
  ON public.campanhas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert campanhas"
  ON public.campanhas
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update campanhas"
  ON public.campanhas
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete campanhas"
  ON public.campanhas
  FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for mensagens_whatsapp
CREATE POLICY "Authenticated users can view all mensagens"
  ON public.mensagens_whatsapp
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert mensagens"
  ON public.mensagens_whatsapp
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update mensagens"
  ON public.mensagens_whatsapp
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete mensagens"
  ON public.mensagens_whatsapp
  FOR DELETE
  TO authenticated
  USING (true);

-- Trigger for leads updated_at
CREATE TRIGGER set_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger for leads ultima_atualizacao
CREATE OR REPLACE FUNCTION public.update_lead_ultima_atualizacao()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ultima_atualizacao = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_lead_ultima_atualizacao
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_ultima_atualizacao();