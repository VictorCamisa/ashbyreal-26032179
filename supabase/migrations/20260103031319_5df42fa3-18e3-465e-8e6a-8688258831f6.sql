-- Add missing columns to produtos table for inventory management
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS preco_custo numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS unidade_medida text DEFAULT 'UN',
ADD COLUMN IF NOT EXISTS fornecedor text,
ADD COLUMN IF NOT EXISTS localizacao text,
ADD COLUMN IF NOT EXISTS margem_lucro numeric DEFAULT 0;