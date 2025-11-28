-- Função para criar receita financeira quando pedido é recebido
CREATE OR REPLACE FUNCTION public.criar_receita_ao_receber_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loja_entity_id uuid;
  receita_category_id uuid;
  caixa_account_id uuid;
BEGIN
  -- Buscar a entidade LOJA
  SELECT id INTO loja_entity_id
  FROM public.entities
  WHERE type = 'LOJA'
  LIMIT 1;

  -- Buscar categoria de receita (Vendas ou similar)
  SELECT id INTO receita_category_id
  FROM public.categories
  WHERE type = 'RECEITA'
  LIMIT 1;

  -- Buscar conta padrão de caixa/banco da loja
  SELECT id INTO caixa_account_id
  FROM public.accounts
  WHERE entity_id = loja_entity_id
    AND is_default = true
  LIMIT 1;

  -- Se não houver conta padrão, pegar a primeira ativa
  IF caixa_account_id IS NULL THEN
    SELECT id INTO caixa_account_id
    FROM public.accounts
    WHERE entity_id = loja_entity_id
      AND is_active = true
    LIMIT 1;
  END IF;

  -- Verificar se já existe uma transação para este pedido
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions
    WHERE notes LIKE '%Pedido #' || NEW.numero_pedido || '%'
      AND entity_id = loja_entity_id
  ) THEN
    -- Criar a transação de receita
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
      NEW.valor_total,
      CASE 
        WHEN NEW.status IN ('entregue', 'concluido', 'pago') THEN 'PAGO'
        ELSE 'PREVISTO'
      END,
      NEW.data_pedido,
      CASE 
        WHEN NEW.status IN ('entregue', 'concluido', 'pago') THEN NEW.data_pedido
        ELSE NULL
      END,
      'Venda - Pedido #' || NEW.numero_pedido,
      receita_category_id,
      caixa_account_id,
      'Pedido #' || NEW.numero_pedido || ' - Cliente: ' || (SELECT nome FROM public.clientes WHERE id = NEW.cliente_id),
      'MANUAL',
      DATE_TRUNC('month', NEW.data_pedido)::date
    );
  ELSE
    -- Atualizar a transação existente se o status mudou
    UPDATE public.transactions
    SET 
      amount = NEW.valor_total,
      status = CASE 
        WHEN NEW.status IN ('entregue', 'concluido', 'pago') THEN 'PAGO'
        ELSE 'PREVISTO'
      END,
      payment_date = CASE 
        WHEN NEW.status IN ('entregue', 'concluido', 'pago') THEN NEW.data_pedido
        ELSE NULL
      END
    WHERE notes LIKE '%Pedido #' || NEW.numero_pedido || '%'
      AND entity_id = loja_entity_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para inserção de pedidos
DROP TRIGGER IF EXISTS trigger_criar_receita_pedido_insert ON public.pedidos;
CREATE TRIGGER trigger_criar_receita_pedido_insert
  AFTER INSERT ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_receita_ao_receber_pedido();

-- Criar trigger para atualização de pedidos
DROP TRIGGER IF EXISTS trigger_criar_receita_pedido_update ON public.pedidos;
CREATE TRIGGER trigger_criar_receita_pedido_update
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.valor_total IS DISTINCT FROM NEW.valor_total)
  EXECUTE FUNCTION public.criar_receita_ao_receber_pedido();