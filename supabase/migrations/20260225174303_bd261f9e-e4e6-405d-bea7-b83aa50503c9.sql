CREATE OR REPLACE FUNCTION public.recalculate_invoice_total(invoice_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculated_total NUMERIC;
  importado_total NUMERIC;
  invoice_record RECORD;
BEGIN
  -- Get invoice details
  SELECT credit_card_id, competencia INTO invoice_record
  FROM credit_card_invoices
  WHERE id = invoice_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Check if there are IMPORTADO transactions (real data)
  SELECT COALESCE(SUM(amount), 0) INTO importado_total
  FROM credit_card_transactions
  WHERE credit_card_id = invoice_record.credit_card_id
    AND competencia = invoice_record.competencia
    AND item_status = 'IMPORTADO';
  
  IF importado_total > 0 THEN
    -- Use only IMPORTADO (real) transactions
    calculated_total := importado_total;
  ELSE
    -- No real data, use all (PROJETADO only for future months)
    SELECT COALESCE(SUM(amount), 0) INTO calculated_total
    FROM credit_card_transactions
    WHERE credit_card_id = invoice_record.credit_card_id
      AND competencia = invoice_record.competencia;
  END IF;
  
  -- Update the invoice
  UPDATE credit_card_invoices
  SET total_value = calculated_total,
      updated_at = NOW()
  WHERE id = invoice_id;
  
  RETURN calculated_total;
END;
$function$;