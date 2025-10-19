-- Create tickets table (enums already exist)
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assunto TEXT NOT NULL,
  descricao TEXT NOT NULL,
  prioridade public.prioridade_ticket NOT NULL DEFAULT 'media',
  status public.status_ticket NOT NULL DEFAULT 'aberto',
  data_abertura TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ultima_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responsavel TEXT,
  resolucao TEXT,
  anexos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.tickets;

-- RLS Policies: Users can only see their own tickets
CREATE POLICY "Users can view their own tickets"
ON public.tickets
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own tickets
CREATE POLICY "Users can create their own tickets"
ON public.tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own tickets
CREATE POLICY "Users can update their own tickets"
ON public.tickets
FOR UPDATE
USING (auth.uid() = user_id);

-- Drop trigger if exists
DROP TRIGGER IF EXISTS update_tickets_ultima_atualizacao ON public.tickets;

-- Add trigger to update ultima_atualizacao automatically
CREATE TRIGGER update_tickets_ultima_atualizacao
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_data_abertura ON public.tickets(data_abertura DESC);