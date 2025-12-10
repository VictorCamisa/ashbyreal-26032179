-- Drop and recreate the trigger function to handle both APROVADO and direct PAGO
CREATE OR REPLACE FUNCTION public.criar_transacao_boleto_aprovado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_transaction_id uuid;
  despesa_category_id uuid;
BEGIN
  -- Get a default expense category
  SELECT id INTO despesa_category_id
  FROM public.categories
  WHERE type = 'DESPESA'
  LIMIT 1;

  -- Create transaction when status changes to APROVADO and no transaction exists
  IF NEW.status = 'APROVADO' AND OLD.status != 'APROVADO' AND NEW.transaction_id IS NULL THEN
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

    NEW.transaction_id := new_transaction_id;
    NEW.approved_at := now();
  END IF;

  -- When boleto is marked as PAGO
  IF NEW.status = 'PAGO' AND OLD.status != 'PAGO' THEN
    -- If there's already a transaction, just update it
    IF NEW.transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'PAGO', payment_date = now()::text
      WHERE id = NEW.transaction_id;
    ELSE
      -- No transaction exists, create one as PAGO directly
      INSERT INTO public.transactions (
        entity_id,
        tipo,
        amount,
        status,
        due_date,
        payment_date,
        description,
        category_id,
        notes,
        origin,
        reference_month
      ) VALUES (
        NEW.entity_id,
        'PAGAR',
        NEW.amount::text,
        'PAGO',
        NEW.due_date::text,
        now()::text,
        COALESCE(NEW.description, NEW.beneficiario, 'Boleto'),
        despesa_category_id,
        COALESCE(NEW.notes, '') || ' | Boleto ' || (CASE WHEN NEW.tipo_nota = 'COM_NOTA' THEN 'COM NOTA' ELSE 'SEM NOTA' END),
        'MANUAL',
        DATE_TRUNC('month', NEW.due_date)::text
      )
      RETURNING id INTO new_transaction_id;

      NEW.transaction_id := new_transaction_id;
    END IF;
    
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
$function$;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS trigger_criar_transacao_boleto ON public.boletos;
CREATE TRIGGER trigger_criar_transacao_boleto
  BEFORE UPDATE ON public.boletos
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_transacao_boleto_aprovado();