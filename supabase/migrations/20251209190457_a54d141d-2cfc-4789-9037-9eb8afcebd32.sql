-- Tabela para conversas da Evolution API
CREATE TABLE public.evolution_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  push_name TEXT,
  profile_pic_url TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  is_group BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_name, remote_jid)
);

-- Tabela para mensagens da Evolution API
CREATE TABLE public.evolution_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES public.evolution_chats(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  message_id TEXT NOT NULL,
  from_me BOOLEAN NOT NULL DEFAULT false,
  body TEXT,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_name, message_id)
);

-- Índices para performance
CREATE INDEX idx_evolution_chats_instance ON public.evolution_chats(instance_name);
CREATE INDEX idx_evolution_chats_remote_jid ON public.evolution_chats(remote_jid);
CREATE INDEX idx_evolution_messages_chat_id ON public.evolution_messages(chat_id);
CREATE INDEX idx_evolution_messages_timestamp ON public.evolution_messages(timestamp DESC);

-- Enable RLS
ALTER TABLE public.evolution_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para evolution_chats
CREATE POLICY "Authenticated users can view evolution_chats"
  ON public.evolution_chats FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert evolution_chats"
  ON public.evolution_chats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update evolution_chats"
  ON public.evolution_chats FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete evolution_chats"
  ON public.evolution_chats FOR DELETE
  USING (true);

-- RLS Policies para evolution_messages
CREATE POLICY "Authenticated users can view evolution_messages"
  ON public.evolution_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert evolution_messages"
  ON public.evolution_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update evolution_messages"
  ON public.evolution_messages FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete evolution_messages"
  ON public.evolution_messages FOR DELETE
  USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_evolution_chats_updated_at
  BEFORE UPDATE ON public.evolution_chats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Habilitar Realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evolution_messages;