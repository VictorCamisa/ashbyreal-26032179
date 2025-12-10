-- Drop old triggers first
DROP TRIGGER IF EXISTS trigger_criar_receita_pedido_insert ON public.pedidos;
DROP TRIGGER IF EXISTS trigger_criar_receita_pedido_update ON public.pedidos;

-- Now drop the old function that was causing duplicates
DROP FUNCTION IF EXISTS public.criar_receita_ao_receber_pedido() CASCADE;