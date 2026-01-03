-- =============================================
-- FASE 1: DELETAR TODAS AS TABELAS ANTIGAS DO WHATSAPP
-- =============================================

-- Drop das tabelas antigas (na ordem correta por causa das foreign keys)
DROP TABLE IF EXISTS mensagens_whatsapp CASCADE;
DROP TABLE IF EXISTS whatsapp_contacts CASCADE;
DROP TABLE IF EXISTS whatsapp_templates CASCADE;
DROP TABLE IF EXISTS whatsapp_conversas CASCADE;
DROP TABLE IF EXISTS evolution_messages CASCADE;
DROP TABLE IF EXISTS evolution_chats CASCADE;
DROP TABLE IF EXISTS whatsapp_instances CASCADE;

-- =============================================
-- FASE 2: CRIAR NOVAS TABELAS
-- =============================================

-- Tabela: whatsapp_instances
CREATE TABLE public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  instance_name text UNIQUE NOT NULL,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting')),
  phone_number text,
  qr_code text,
  webhook_url text,
  webhook_enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela: whatsapp_messages (com metadata para sender_name/push_name)
CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  remote_jid text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker')),
  content text,
  media_url text,
  status text DEFAULT 'sent',
  external_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_messages_instance_id ON public.whatsapp_messages(instance_id);
CREATE INDEX idx_whatsapp_messages_remote_jid ON public.whatsapp_messages(remote_jid);
CREATE INDEX idx_whatsapp_messages_created_at ON public.whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_instances_instance_name ON public.whatsapp_instances(instance_name);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage whatsapp_instances"
  ON public.whatsapp_instances FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage whatsapp_messages"
  ON public.whatsapp_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================
-- REALTIME PARA MENSAGENS
-- =============================================

ALTER TABLE public.whatsapp_messages REPLICA IDENTITY FULL;

-- Adicionar à publicação realtime (se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Trigger para updated_at na tabela instances
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();