-- Add missing columns to credit_cards
ALTER TABLE public.credit_cards 
  ADD COLUMN IF NOT EXISTS limit_value DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS card_provider TEXT;

-- Add missing columns to categories (group column)
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS "group" TEXT;

-- Add missing columns to extra_hours_summary
ALTER TABLE public.extra_hours_summary 
  ADD COLUMN IF NOT EXISTS horas_extras DECIMAL(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horas_faltas DECIMAL(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_banco_horas DECIMAL(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_extras DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS transaction_pagamento_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

-- Add missing columns to ashby_orders
ALTER TABLE public.ashby_orders 
  ADD COLUMN IF NOT EXISTS liters DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_sem_nf DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS value_com_nf DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total DECIMAL(12,2) DEFAULT 0;

-- Add missing columns to transactions
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS reference_month DATE;

-- Add missing columns to pedidos
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]';

-- Add missing columns to credit_card_transactions  
ALTER TABLE public.credit_card_transactions
  ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12,2);

-- Add installment_info to credit_card_transactions
ALTER TABLE public.credit_card_transactions
  ADD COLUMN IF NOT EXISTS installment_info TEXT;