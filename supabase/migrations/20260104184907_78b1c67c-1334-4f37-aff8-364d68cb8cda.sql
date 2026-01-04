-- Tabela para despesas fixas/recorrentes
CREATE TABLE public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  subcategory_id UUID REFERENCES public.subcategories(id),
  account_id UUID REFERENCES public.accounts(id),
  
  -- Recorrência
  frequency TEXT NOT NULL DEFAULT 'MENSAL',
  day_of_month INTEGER DEFAULT 1,
  
  -- Período de vigência
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Controle
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Authenticated users can manage recurring_expenses"
ON public.recurring_expenses
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_recurring_expenses_updated_at
BEFORE UPDATE ON public.recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_recurring_expenses_entity ON public.recurring_expenses(entity_id);
CREATE INDEX idx_recurring_expenses_active ON public.recurring_expenses(is_active) WHERE is_active = true;