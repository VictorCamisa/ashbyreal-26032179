
-- Add new factory values to the enum
ALTER TYPE barril_localizacao ADD VALUE IF NOT EXISTS 'DATTA_VALE';
ALTER TYPE barril_localizacao ADD VALUE IF NOT EXISTS 'ASHBY';

-- Update existing FABRICA records to DATTA_VALE (default migration)
-- We keep FABRICA in the enum for backward compat but won't use it in the UI
-- Users will choose between DATTA_VALE and ASHBY going forward
