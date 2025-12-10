-- Create boletos table to store boleto history with images
CREATE TABLE public.boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  entity_id UUID NOT NULL REFERENCES public.entities(id),
  description TEXT,
  beneficiario TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  tipo_nota TEXT NOT NULL CHECK (tipo_nota IN ('COM_NOTA', 'SEM_NOTA')),
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'APROVADO', 'PAGO', 'REJEITADO', 'CANCELADO')),
  image_base64 TEXT,
  notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

-- RLS policies for boletos
CREATE POLICY "Authenticated users can view all boletos" 
ON public.boletos FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert boletos" 
ON public.boletos FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update boletos" 
ON public.boletos FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete boletos" 
ON public.boletos FOR DELETE USING (true);

-- Trigger to update updated_at
CREATE TRIGGER update_boletos_updated_at
BEFORE UPDATE ON public.boletos
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to create transaction when boleto is approved
CREATE OR REPLACE FUNCTION public.criar_transacao_boleto_aprovado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_transaction_id uuid;
  despesa_category_id uuid;
BEGIN
  -- Only create transaction when status changes to APROVADO and no transaction exists
  IF NEW.status = 'APROVADO' AND OLD.status != 'APROVADO' AND NEW.transaction_id IS NULL THEN
    -- Get a default expense category
    SELECT id INTO despesa_category_id
    FROM public.categories
    WHERE type = 'DESPESA'
    LIMIT 1;

    -- Create the transaction
    INSERT INTO public.transactions (
      entity_id,
      tipo,
      amount,
      status,
      due_date,
      description,
      category_id,
      notes,
      origin,
      reference_month
    ) VALUES (
      NEW.entity_id,
      'PAGAR',
      NEW.amount::text,
      'PREVISTO',
      NEW.due_date::text,
      COALESCE(NEW.description, NEW.beneficiario, 'Boleto'),
      despesa_category_id,
      COALESCE(NEW.notes, '') || ' | Boleto ' || (CASE WHEN NEW.tipo_nota = 'COM_NOTA' THEN 'COM NOTA' ELSE 'SEM NOTA' END),
      'MANUAL',
      DATE_TRUNC('month', NEW.due_date)::text
    )
    RETURNING id INTO new_transaction_id;

    -- Link transaction to boleto
    NEW.transaction_id := new_transaction_id;
    NEW.approved_at := now();
  END IF;

  -- When boleto is marked as PAGO, update the linked transaction
  IF NEW.status = 'PAGO' AND OLD.status != 'PAGO' AND NEW.transaction_id IS NOT NULL THEN
    UPDATE public.transactions
    SET status = 'PAGO', payment_date = now()::text
    WHERE id = NEW.transaction_id;
    
    NEW.paid_at := now();
  END IF;

  -- When boleto is cancelled, cancel the linked transaction
  IF NEW.status = 'CANCELADO' AND OLD.status != 'CANCELADO' AND NEW.transaction_id IS NOT NULL THEN
    UPDATE public.transactions
    SET status = 'CANCELADO'
    WHERE id = NEW.transaction_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for boleto status changes
CREATE TRIGGER handle_boleto_status_change
BEFORE UPDATE ON public.boletos
FOR EACH ROW
EXECUTE FUNCTION public.criar_transacao_boleto_aprovado();