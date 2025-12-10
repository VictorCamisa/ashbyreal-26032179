-- Add tags column to transactions table for custom tagging
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb;

-- Create index for better tag search performance
CREATE INDEX IF NOT EXISTS idx_transactions_tags ON public.transactions USING GIN(tags);