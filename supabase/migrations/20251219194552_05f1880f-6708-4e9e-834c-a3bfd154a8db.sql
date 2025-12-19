-- Add import_id column (no constraint IF NOT EXISTS - Postgres 9.6+ only)
ALTER TABLE public.credit_card_transactions
ADD COLUMN IF NOT EXISTS import_id uuid NULL;

-- Add FK only if it doesn't exist already (use DO block)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'credit_card_transactions_import_id_fkey'
  ) THEN
    ALTER TABLE public.credit_card_transactions
    ADD CONSTRAINT credit_card_transactions_import_id_fkey
    FOREIGN KEY (import_id)
    REFERENCES public.credit_card_imports(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_import_id
ON public.credit_card_transactions(import_id);

CREATE INDEX IF NOT EXISTS idx_credit_card_transactions_card_invoice
ON public.credit_card_transactions(credit_card_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_credit_card_imports_card_competencia
ON public.credit_card_imports(credit_card_id, competencia);