
-- Corrigir função sync_invoice_to_transaction - reference_month é date, não text
CREATE OR REPLACE FUNCTION public.sync_invoice_to_transaction(invoice_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invoice_record RECORD;
  card_record RECORD;
  existing_transaction_id UUID;
  new_transaction_id UUID;
  transaction_status transaction_status;
BEGIN
  -- Get invoice details
  SELECT * INTO invoice_record
  FROM credit_card_invoices
  WHERE id = invoice_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Get card details
  SELECT * INTO card_record
  FROM credit_cards
  WHERE id = invoice_record.credit_card_id;
  
  -- Check if transaction already exists
  existing_transaction_id := invoice_record.transaction_id;
  
  -- Determine status based on invoice status
  IF invoice_record.status = 'PAGA' THEN
    transaction_status := 'PAGO';
  ELSE
    transaction_status := 'PREVISTO';
  END IF;
  
  IF existing_transaction_id IS NOT NULL THEN
    -- Update existing transaction
    UPDATE transactions
    SET amount = invoice_record.total_value,
        due_date = invoice_record.due_date,
        status = transaction_status,
        payment_date = CASE WHEN invoice_record.status = 'PAGA' THEN invoice_record.payment_date ELSE NULL END,
        account_id = CASE WHEN invoice_record.status = 'PAGA' THEN card_record.account_liquidacao_id ELSE NULL END,
        updated_at = NOW()
    WHERE id = existing_transaction_id;
    
    RETURN existing_transaction_id;
  ELSE
    -- Create new transaction only if invoice is FECHADA or PAGA
    IF invoice_record.status IN ('FECHADA', 'PAGA') THEN
      INSERT INTO transactions (
        description,
        amount,
        tipo,
        status,
        due_date,
        payment_date,
        account_id,
        entity_id,
        origin,
        origin_reference_id,
        reference_month
      ) VALUES (
        'Fatura ' || card_record.name || ' - ' || TO_CHAR(invoice_record.competencia, 'MM/YYYY'),
        invoice_record.total_value,
        'PAGAR',
        transaction_status,
        invoice_record.due_date,
        CASE WHEN invoice_record.status = 'PAGA' THEN invoice_record.payment_date ELSE NULL END,
        CASE WHEN invoice_record.status = 'PAGA' THEN card_record.account_liquidacao_id ELSE NULL END,
        card_record.entity_id,
        'FATURA_CARTAO',
        invoice_id,
        invoice_record.competencia  -- Agora é date, não text
      )
      RETURNING id INTO new_transaction_id;
      
      -- Update invoice with transaction_id
      UPDATE credit_card_invoices
      SET transaction_id = new_transaction_id
      WHERE id = invoice_id;
      
      RETURN new_transaction_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$function$;
