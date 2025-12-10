-- Create or replace the function to handle order-to-transaction integration
CREATE OR REPLACE FUNCTION public.criar_receita_ao_finalizar_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  loja_entity_id uuid;
  receita_category_id uuid;
  caixa_account_id uuid;
  new_transaction_id uuid;
BEGIN
  -- Only process when status changes to 'pago' or order is created with 'pago' status
  IF (TG_OP = 'INSERT' AND NEW.status = 'pago') OR 
     (TG_OP = 'UPDATE' AND NEW.status = 'pago' AND OLD.status != 'pago') THEN
    
    -- Skip if transaction already linked
    IF NEW.transaction_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    -- Get LOJA entity
    SELECT id INTO loja_entity_id
    FROM public.entities
    WHERE type = 'LOJA'
    LIMIT 1;

    -- Get receita category (Vendas or similar)
    SELECT id INTO receita_category_id
    FROM public.categories
    WHERE type = 'RECEITA'
    LIMIT 1;

    -- Get default account for LOJA
    SELECT id INTO caixa_account_id
    FROM public.accounts
    WHERE entity_id = loja_entity_id
      AND is_default = true
    LIMIT 1;

    -- Fallback to first active account
    IF caixa_account_id IS NULL THEN
      SELECT id INTO caixa_account_id
      FROM public.accounts
      WHERE entity_id = loja_entity_id
        AND is_active = true
      LIMIT 1;
    END IF;

    -- Create the transaction
    INSERT INTO public.transactions (
      entity_id,
      tipo,
      amount,
      status,
      due_date,
      payment_date,
      description,
      category_id,
      account_id,
      notes,
      origin,
      reference_month
    ) VALUES (
      loja_entity_id,
      'RECEBER',
      NEW.valor_total::text,
      'PAGO',
      NEW.data_pedido::text,
      COALESCE(NEW.data_pagamento, now())::text,
      'Venda - Pedido #' || NEW.numero_pedido,
      receita_category_id,
      caixa_account_id,
      'Pedido #' || NEW.numero_pedido || ' - Cliente: ' || (SELECT nome FROM public.clientes WHERE id = NEW.cliente_id),
      'MANUAL',
      DATE_TRUNC('month', NEW.data_pedido)::text
    )
    RETURNING id INTO new_transaction_id;

    -- Update pedido with transaction_id
    NEW.transaction_id := new_transaction_id;
    
  -- Handle cancellation - cancel linked transaction
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    IF NEW.transaction_id IS NOT NULL THEN
      UPDATE public.transactions
      SET status = 'CANCELADO'
      WHERE id = NEW.transaction_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_criar_receita_pedido ON public.pedidos;

CREATE TRIGGER trigger_criar_receita_pedido
  BEFORE INSERT OR UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_receita_ao_finalizar_pedido();