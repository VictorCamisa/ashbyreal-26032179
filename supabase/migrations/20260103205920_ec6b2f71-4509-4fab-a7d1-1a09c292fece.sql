-- =====================================================
-- FASE 1: Migração do Módulo de Cartões (Sub-Ledger)
-- =====================================================

-- 1.1 Adicionar campo account_liquidacao_id à tabela credit_cards
ALTER TABLE public.credit_cards 
ADD COLUMN IF NOT EXISTS account_liquidacao_id UUID REFERENCES public.accounts(id);

-- 1.2 Criar ENUM para status de transações de cartão
DO $$ BEGIN
  CREATE TYPE card_transaction_status AS ENUM ('IMPORTADO', 'CLASSIFICADO', 'CONFIRMADO', 'POSTADO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1.3 Adicionar campos à tabela credit_card_transactions
ALTER TABLE public.credit_card_transactions 
ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
ADD COLUMN IF NOT EXISTS item_status TEXT DEFAULT 'IMPORTADO',
ADD COLUMN IF NOT EXISTS source_import_id UUID REFERENCES public.credit_card_imports(id),
ADD COLUMN IF NOT EXISTS parent_purchase_id UUID;

-- Criar índice único para dedupe_key (evitar duplicatas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_card_transactions_dedupe_key 
ON public.credit_card_transactions(dedupe_key) 
WHERE dedupe_key IS NOT NULL;

-- 1.4 Melhorar tabela credit_card_imports
ALTER TABLE public.credit_card_imports 
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD COLUMN IF NOT EXISTS competencia DATE,
ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Criar índice para file_hash (evitar reimportar mesmo arquivo)
CREATE INDEX IF NOT EXISTS idx_credit_card_imports_file_hash 
ON public.credit_card_imports(file_hash);

-- 1.5 Adicionar campos à tabela credit_card_invoices
ALTER TABLE public.credit_card_invoices 
ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lock_status BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS transaction_posted_id UUID REFERENCES public.transactions(id);

-- 1.6 Criar tabela card_purchases (compras parceladas)
CREATE TABLE IF NOT EXISTS public.card_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  purchase_fingerprint TEXT,
  merchant_normalized TEXT,
  original_description TEXT,
  total_amount NUMERIC,
  installments_total INTEGER DEFAULT 1,
  first_installment_date DATE,
  category_id UUID REFERENCES public.categories(id),
  status TEXT DEFAULT 'ATIVA',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criar índice único para purchase_fingerprint
CREATE UNIQUE INDEX IF NOT EXISTS idx_card_purchases_fingerprint 
ON public.card_purchases(purchase_fingerprint) 
WHERE purchase_fingerprint IS NOT NULL;

-- Adicionar FK de parent_purchase_id em credit_card_transactions
ALTER TABLE public.credit_card_transactions 
ADD CONSTRAINT fk_parent_purchase 
FOREIGN KEY (parent_purchase_id) 
REFERENCES public.card_purchases(id) 
ON DELETE SET NULL;

-- Habilitar RLS na tabela card_purchases
ALTER TABLE public.card_purchases ENABLE ROW LEVEL SECURITY;

-- Criar política RLS para card_purchases
CREATE POLICY "Authenticated users can manage card_purchases" 
ON public.card_purchases 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger para atualizar updated_at em card_purchases
CREATE TRIGGER update_card_purchases_updated_at
BEFORE UPDATE ON public.card_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FASE 2: Inserir os 5 Cartões Iniciais
-- =====================================================

-- Obter o ID da entidade LOJA
DO $$
DECLARE
  loja_entity_id UUID;
BEGIN
  SELECT id INTO loja_entity_id FROM public.entities WHERE name = 'Loja Taubaté Chopp' LIMIT 1;
  
  -- Se não encontrar, usar o primeiro entity do tipo LOJA
  IF loja_entity_id IS NULL THEN
    SELECT id INTO loja_entity_id FROM public.entities WHERE type = 'LOJA' LIMIT 1;
  END IF;

  -- Inserir Latam Pass Itaú (fecha dia 27, vence dia 04)
  INSERT INTO public.credit_cards (name, card_provider, closing_day, due_day, entity_id, credit_limit, is_active)
  VALUES ('Latam Pass Itaú', 'LATAM', 27, 4, loja_entity_id, 15000, true)
  ON CONFLICT DO NOTHING;

  -- Inserir Azul Itaucard (fecha dia 15, vence dia 22)
  INSERT INTO public.credit_cards (name, card_provider, closing_day, due_day, entity_id, credit_limit, is_active)
  VALUES ('Azul Itaucard', 'AZUL', 15, 22, loja_entity_id, 12000, true)
  ON CONFLICT DO NOTHING;

  -- Inserir Santander Smiles (fecha dia 24, vence dia 01)
  INSERT INTO public.credit_cards (name, card_provider, closing_day, due_day, entity_id, credit_limit, is_active)
  VALUES ('Santander Smiles', 'SANTANDER_SMILES', 24, 1, loja_entity_id, 10000, true)
  ON CONFLICT DO NOTHING;

  -- Inserir Mercado Livre (fecha dia 25, vence dia 02)
  INSERT INTO public.credit_cards (name, card_provider, closing_day, due_day, entity_id, credit_limit, is_active)
  VALUES ('Mercado Livre', 'MERCADO_LIVRE', 25, 2, loja_entity_id, 8000, true)
  ON CONFLICT DO NOTHING;

  -- Inserir Itaú Empresas (fecha dia 29, vence dia 06)
  INSERT INTO public.credit_cards (name, card_provider, closing_day, due_day, entity_id, credit_limit, is_active)
  VALUES ('Itaú Empresas', 'ITAU_EMPRESAS', 29, 6, loja_entity_id, 20000, true)
  ON CONFLICT DO NOTHING;

END $$;