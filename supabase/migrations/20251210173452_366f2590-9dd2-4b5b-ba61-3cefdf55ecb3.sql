-- Update trigger to create better descriptions with beneficiario
CREATE OR REPLACE FUNCTION public.criar_transacao_boleto_aprovado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_transaction_id uuid;
  despesa_category_id uuid;
  transaction_description text;
BEGIN
  -- Get a default expense category
  SELECT id INTO despesa_category_id
  FROM public.categories
  WHERE type = 'DESPESA'
  LIMIT 1;

  -- Build a better description with beneficiario
  transaction_description := '';
  IF NEW.beneficiario IS NOT NULL AND NEW.beneficiario != '' THEN
    transaction_description := NEW.beneficiario;
  END IF;
  IF NEW.description IS NOT NULL AND NEW.description != '' THEN
    IF transaction_description != '' THEN
      transaction_description := transaction_description || ' - ' || NEW.description;
    ELSE
      transaction_description := NEW.description;
    END IF;
  END IF;
  IF transaction_description = '' THEN
    transaction_description := 'Boleto';
  END IF;

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
      transaction_description,
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
        transaction_description,
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

-- Update existing boleto transactions to have better descriptions
UPDATE transactions t
SET description = CONCAT(
  COALESCE(b.beneficiario, ''),
  CASE WHEN b.beneficiario IS NOT NULL AND b.description IS NOT NULL THEN ' - ' ELSE '' END,
  COALESCE(b.description, 'Boleto')
)
FROM boletos b
WHERE b.transaction_id = t.id;