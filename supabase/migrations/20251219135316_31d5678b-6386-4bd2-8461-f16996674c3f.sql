-- Add card_provider to credit_cards table
ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS card_provider TEXT;

-- Create credit_card_imports table for import history
CREATE TABLE IF NOT EXISTS public.credit_card_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'CSV', 'XLSX', 'PDF'
  import_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  records_imported INT DEFAULT 0,
  records_failed INT DEFAULT 0,
  competencia DATE, -- Month reference for the invoice
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'PARTIAL', 'FAILED'
  error_log JSONB DEFAULT '[]'::jsonb,
  raw_data JSONB, -- Store parsed data for review
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_card_imports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view all credit_card_imports" 
ON public.credit_card_imports 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert credit_card_imports" 
ON public.credit_card_imports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update credit_card_imports" 
ON public.credit_card_imports 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete credit_card_imports" 
ON public.credit_card_imports 
FOR DELETE 
USING (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_credit_card_imports_card_id ON public.credit_card_imports(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_imports_status ON public.credit_card_imports(status);

-- Comment for documentation
COMMENT ON TABLE public.credit_card_imports IS 'Histórico de importações de faturas de cartão de crédito';
COMMENT ON COLUMN public.credit_cards.card_provider IS 'Provedor do cartão: LATAM, AZUL, ITAU_EMPRESAS, MERCADO_LIVRE, SANTANDER_SMILES';