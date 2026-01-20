-- Fase 1: Adicionar novos valores ao enum transaction_origin
ALTER TYPE transaction_origin ADD VALUE IF NOT EXISTS 'BOLETO';
ALTER TYPE transaction_origin ADD VALUE IF NOT EXISTS 'FATURA_CARTAO';

-- Criar função para recalcular o total de uma fatura baseado nas transações reais
CREATE OR REPLACE FUNCTION public.recalculate_invoice_total(invoice_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculated_total NUMERIC;
  invoice_record RECORD;
BEGIN
  -- Get invoice details
  SELECT credit_card_id, competencia INTO invoice_record
  FROM credit_card_invoices
  WHERE id = invoice_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate total from transactions
  SELECT COALESCE(SUM(amount), 0) INTO calculated_total
  FROM credit_card_transactions
  WHERE credit_card_id = invoice_record.credit_card_id
    AND competencia = invoice_record.competencia;
  
  -- Update the invoice
  UPDATE credit_card_invoices
  SET total_value = calculated_total,
      updated_at = NOW()
  WHERE id = invoice_id;
  
  RETURN calculated_total;
END;
$$;

-- Criar função para recalcular TODAS as faturas de um cartão
CREATE OR REPLACE FUNCTION public.recalculate_all_invoices_for_card(card_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invoice_row RECORD;
  count_updated INTEGER := 0;
BEGIN
  FOR invoice_row IN 
    SELECT id FROM credit_card_invoices WHERE credit_card_id = card_id
  LOOP
    PERFORM recalculate_invoice_total(invoice_row.id);
    count_updated := count_updated + 1;
  END LOOP;
  
  RETURN count_updated;
END;
$$;

-- Criar função para sincronizar fatura com transactions (criar conta a pagar)
CREATE OR REPLACE FUNCTION public.sync_invoice_to_transaction(invoice_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        invoice_record.competencia::TEXT
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
$$;

-- Criar função para sincronizar boleto com transactions
CREATE OR REPLACE FUNCTION public.sync_boleto_to_transaction(boleto_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  boleto_record RECORD;
  existing_transaction_id UUID;
  new_transaction_id UUID;
  transaction_status transaction_status;
BEGIN
  -- Get boleto details
  SELECT * INTO boleto_record
  FROM boletos
  WHERE id = boleto_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Check if transaction already exists
  existing_transaction_id := boleto_record.transaction_id;
  
  -- Determine status based on boleto status
  CASE boleto_record.status
    WHEN 'PAGO' THEN transaction_status := 'PAGO';
    WHEN 'CANCELADO' THEN transaction_status := 'CANCELADO';
    WHEN 'REJEITADO' THEN transaction_status := 'CANCELADO';
    ELSE transaction_status := 'PREVISTO';
  END CASE;
  
  IF existing_transaction_id IS NOT NULL THEN
    -- Update existing transaction
    UPDATE transactions
    SET amount = boleto_record.amount,
        due_date = boleto_record.due_date,
        status = transaction_status,
        payment_date = boleto_record.paid_at,
        description = COALESCE(boleto_record.description, boleto_record.beneficiario, 'Boleto'),
        updated_at = NOW()
    WHERE id = existing_transaction_id;
    
    RETURN existing_transaction_id;
  ELSE
    -- Create new transaction only if boleto is APROVADO or PAGO
    IF boleto_record.status IN ('APROVADO', 'PAGO') THEN
      INSERT INTO transactions (
        description,
        amount,
        tipo,
        status,
        due_date,
        payment_date,
        entity_id,
        origin,
        origin_reference_id,
        notes
      ) VALUES (
        COALESCE(boleto_record.description, boleto_record.beneficiario, 'Boleto'),
        boleto_record.amount,
        'PAGAR',
        transaction_status,
        boleto_record.due_date,
        boleto_record.paid_at,
        boleto_record.entity_id,
        'BOLETO',
        boleto_id,
        boleto_record.notes
      )
      RETURNING id INTO new_transaction_id;
      
      -- Update boleto with transaction_id
      UPDATE boletos
      SET transaction_id = new_transaction_id
      WHERE id = boleto_id;
      
      RETURN new_transaction_id;
    END IF;
  END IF;
  
  RETURN NULL;
END;
$$;