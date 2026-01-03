-- Add cliente_id column to leads table (required relationship)
ALTER TABLE public.leads 
ADD COLUMN cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX idx_leads_cliente_id ON public.leads(cliente_id);

-- Update existing leads to link with clients that have the same phone number
UPDATE public.leads l
SET cliente_id = c.id
FROM public.clientes c
WHERE l.telefone = c.telefone AND l.cliente_id IS NULL;

-- For any remaining leads without a matching client, create clients for them
INSERT INTO public.clientes (id, nome, telefone, email, origem, status)
SELECT 
  l.id,
  l.nome,
  l.telefone,
  COALESCE(l.email, l.telefone || '@temp.local'),
  l.origem,
  'lead'
FROM public.leads l
WHERE l.cliente_id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Now link the remaining leads
UPDATE public.leads l
SET cliente_id = l.id
WHERE l.cliente_id IS NULL;

-- Make cliente_id NOT NULL after all data is migrated
ALTER TABLE public.leads 
ALTER COLUMN cliente_id SET NOT NULL;