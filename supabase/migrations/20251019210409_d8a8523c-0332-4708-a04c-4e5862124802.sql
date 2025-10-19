-- Create pedidos table
CREATE TABLE IF NOT EXISTS public.pedidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  numero_pedido text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  valor_total numeric NOT NULL DEFAULT 0,
  data_pedido timestamp with time zone NOT NULL DEFAULT now(),
  data_entrega timestamp with time zone,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for pedidos
CREATE POLICY "Authenticated users can view all pedidos"
  ON public.pedidos
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert pedidos"
  ON public.pedidos
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update pedidos"
  ON public.pedidos
  FOR UPDATE
  USING (true);

CREATE POLICY "Authenticated users can delete pedidos"
  ON public.pedidos
  FOR DELETE
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();