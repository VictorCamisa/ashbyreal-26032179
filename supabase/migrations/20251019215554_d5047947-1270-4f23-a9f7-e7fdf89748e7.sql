-- Create table for WhatsApp message templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  categoria TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for WhatsApp conversations
CREATE TABLE IF NOT EXISTS public.whatsapp_conversas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  telefone TEXT NOT NULL,
  nome_contato TEXT NOT NULL,
  ultima_mensagem TEXT,
  ultima_interacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ativa',
  nao_lida BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update existing mensagens_whatsapp table to link to conversations
ALTER TABLE public.mensagens_whatsapp 
ADD COLUMN IF NOT EXISTS conversa_id UUID REFERENCES public.whatsapp_conversas(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'enviada',
ADD COLUMN IF NOT EXISTS lida BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Authenticated users can create templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Authenticated users can update templates" ON public.whatsapp_templates;
DROP POLICY IF EXISTS "Authenticated users can delete templates" ON public.whatsapp_templates;

CREATE POLICY "Authenticated users can view templates"
ON public.whatsapp_templates FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create templates"
ON public.whatsapp_templates FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update templates"
ON public.whatsapp_templates FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete templates"
ON public.whatsapp_templates FOR DELETE USING (true);

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Authenticated users can view conversas" ON public.whatsapp_conversas;
DROP POLICY IF EXISTS "Authenticated users can create conversas" ON public.whatsapp_conversas;
DROP POLICY IF EXISTS "Authenticated users can update conversas" ON public.whatsapp_conversas;
DROP POLICY IF EXISTS "Authenticated users can delete conversas" ON public.whatsapp_conversas;

CREATE POLICY "Authenticated users can view conversas"
ON public.whatsapp_conversas FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create conversas"
ON public.whatsapp_conversas FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversas"
ON public.whatsapp_conversas FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete conversas"
ON public.whatsapp_conversas FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_cliente ON public.whatsapp_conversas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_status ON public.whatsapp_conversas(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversas_ultima_interacao ON public.whatsapp_conversas(ultima_interacao DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON public.mensagens_whatsapp(conversa_id);

-- Add trigger to update conversas timestamps
DROP TRIGGER IF EXISTS update_whatsapp_conversas_updated_at ON public.whatsapp_conversas;
CREATE TRIGGER update_whatsapp_conversas_updated_at
BEFORE UPDATE ON public.whatsapp_conversas
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS update_whatsapp_templates_updated_at ON public.whatsapp_templates;
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();