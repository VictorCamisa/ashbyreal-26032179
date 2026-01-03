-- Add new columns to campanhas table
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instances(id);
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS message_template TEXT;
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS media_type TEXT;
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}';
ALTER TABLE campanhas ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Create table to track individual sends
CREATE TABLE IF NOT EXISTS campanha_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT,
  cliente_telefone TEXT,
  remote_jid TEXT,
  status TEXT DEFAULT 'pendente',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE campanha_envios ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Authenticated users can manage campanha_envios" ON campanha_envios
  FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE campanha_envios;