-- Add deposit (sinal) column to pedidos table
ALTER TABLE public.pedidos 
ADD COLUMN valor_sinal numeric DEFAULT 0;

-- Add a comment for documentation
COMMENT ON COLUMN public.pedidos.valor_sinal IS 'Valor de sinal/entrada pago pelo cliente antes da entrega';