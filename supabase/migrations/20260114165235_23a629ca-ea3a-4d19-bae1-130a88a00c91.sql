-- Tabela de agentes de IA
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 1000,
  knowledge_tables TEXT[] DEFAULT '{}',
  qualification_criteria JSONB DEFAULT '{}',
  transfer_keywords TEXT[] DEFAULT '{}',
  greeting_message TEXT,
  instance_id UUID REFERENCES public.whatsapp_instances(id),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de conversas com o agente
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  status TEXT DEFAULT 'active',
  qualification_status TEXT DEFAULT 'pending',
  qualification_score INTEGER DEFAULT 0,
  qualification_notes TEXT,
  transferred_at TIMESTAMP WITH TIME ZONE,
  transferred_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de mensagens das conversas
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Policies para agentes
CREATE POLICY "Authenticated users can manage agents" ON public.ai_agents
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies para conversas
CREATE POLICY "Authenticated users can manage conversations" ON public.ai_conversations
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies para mensagens
CREATE POLICY "Authenticated users can manage messages" ON public.ai_messages
  FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_ai_conversations_agent ON public.ai_conversations(agent_id);
CREATE INDEX idx_ai_conversations_remote_jid ON public.ai_conversations(remote_jid);
CREATE INDEX idx_ai_messages_conversation ON public.ai_messages(conversation_id);

-- Trigger para updated_at
CREATE TRIGGER update_ai_agents_updated_at
  BEFORE UPDATE ON public.ai_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();