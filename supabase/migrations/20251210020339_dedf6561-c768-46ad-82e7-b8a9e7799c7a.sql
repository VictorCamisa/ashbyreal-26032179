-- Add new columns to pedidos table
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT,
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_pagamento TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id);

-- Create function to deduct stock when order items are inserted
CREATE OR REPLACE FUNCTION public.descontar_estoque_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deduct stock from product
  UPDATE public.produtos
  SET 
    estoque = estoque - NEW.quantidade,
    updated_at = now()
  WHERE id = NEW.produto_id;
  
  -- Register stock movement
  INSERT INTO public.movimentacoes_estoque (
    produto_id,
    tipo,
    quantidade,
    quantidade_anterior,
    quantidade_nova,
    responsavel,
    motivo,
    documento
  )
  SELECT 
    NEW.produto_id,
    'saida',
    NEW.quantidade,
    p.estoque + NEW.quantidade,
    p.estoque,
    'Sistema',
    'Venda - Pedido',
    NEW.pedido_id::text
  FROM public.produtos p
  WHERE p.id = NEW.produto_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic stock deduction
DROP TRIGGER IF EXISTS after_pedido_item_insert ON public.pedido_itens;
CREATE TRIGGER after_pedido_item_insert
AFTER INSERT ON public.pedido_itens
FOR EACH ROW
EXECUTE FUNCTION public.descontar_estoque_pedido();

-- Create function to restore stock when order is cancelled
CREATE OR REPLACE FUNCTION public.restaurar_estoque_pedido_cancelado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only restore if status changed to 'cancelado'
  IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    -- Restore stock for all items in the order
    UPDATE public.produtos p
    SET 
      estoque = p.estoque + pi.quantidade,
      updated_at = now()
    FROM public.pedido_itens pi
    WHERE pi.pedido_id = NEW.id
    AND p.id = pi.produto_id;
    
    -- Register stock movements for restoration
    INSERT INTO public.movimentacoes_estoque (
      produto_id,
      tipo,
      quantidade,
      quantidade_anterior,
      quantidade_nova,
      responsavel,
      motivo,
      documento
    )
    SELECT 
      pi.produto_id,
      'entrada',
      pi.quantidade,
      p.estoque - pi.quantidade,
      p.estoque,
      'Sistema',
      'Cancelamento - Pedido',
      NEW.id::text
    FROM public.pedido_itens pi
    JOIN public.produtos p ON p.id = pi.produto_id
    WHERE pi.pedido_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for stock restoration on cancel
DROP TRIGGER IF EXISTS after_pedido_cancel ON public.pedidos;
CREATE TRIGGER after_pedido_cancel
AFTER UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.restaurar_estoque_pedido_cancelado();