-- Add columns for tracking returned items in orders
ALTER TABLE public.pedido_itens 
ADD COLUMN quantidade_devolvida integer DEFAULT 0,
ADD COLUMN valor_devolvido numeric DEFAULT 0;

COMMENT ON COLUMN public.pedido_itens.quantidade_devolvida IS 'Quantidade de itens devolvidos pelo cliente (consignado)';
COMMENT ON COLUMN public.pedido_itens.valor_devolvido IS 'Valor total estornado pela devolução deste item';

-- Create trigger to restore stock on return
CREATE OR REPLACE FUNCTION public.restaurar_estoque_devolucao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  qtd_nova_devolucao INTEGER;
  current_stock INTEGER;
BEGIN
  -- Calculate new returned quantity
  qtd_nova_devolucao := COALESCE(NEW.quantidade_devolvida, 0) - COALESCE(OLD.quantidade_devolvida, 0);
  
  IF qtd_nova_devolucao > 0 THEN
    -- Get current stock
    SELECT estoque INTO current_stock FROM public.produtos WHERE id = NEW.produto_id;
    
    -- Restore stock
    UPDATE public.produtos 
    SET estoque = estoque + qtd_nova_devolucao
    WHERE id = NEW.produto_id;
    
    -- Record movement
    INSERT INTO public.movimentacoes_estoque (produto_id, tipo, quantidade, quantidade_anterior, quantidade_nova, motivo, referencia_id)
    VALUES (NEW.produto_id, 'entrada', qtd_nova_devolucao, current_stock, current_stock + qtd_nova_devolucao, 'Devolução - Consignado', NEW.pedido_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_restaurar_estoque_devolucao
AFTER UPDATE ON public.pedido_itens
FOR EACH ROW
WHEN (COALESCE(NEW.quantidade_devolvida, 0) > COALESCE(OLD.quantidade_devolvida, 0))
EXECUTE FUNCTION public.restaurar_estoque_devolucao();