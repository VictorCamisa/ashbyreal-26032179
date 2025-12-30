-- Add missing columns to produtos
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER DEFAULT 5;

-- Add missing column to whatsapp_instances  
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false;