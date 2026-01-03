-- Create delivery receipts table for digital signature tracking
CREATE TABLE public.delivery_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed')),
  
  -- Receipt data
  cliente_nome TEXT,
  cliente_telefone TEXT,
  cliente_cpf_cnpj TEXT,
  cliente_endereco JSONB,
  
  -- Barrel control
  controle_barris JSONB DEFAULT '{}',
  
  -- Delivery info
  data_entrega DATE,
  periodo_entrega TEXT,
  metodo_pagamento TEXT,
  observacoes TEXT,
  
  -- Signature
  signature_data TEXT, -- base64 of signature image
  signed_at TIMESTAMP WITH TIME ZONE,
  signed_ip TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (admin)
CREATE POLICY "Authenticated users can manage delivery_receipts"
  ON public.delivery_receipts
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy for public access to sign (via token) - SELECT only
CREATE POLICY "Public can view receipt by token"
  ON public.delivery_receipts
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_delivery_receipts_updated_at
  BEFORE UPDATE ON public.delivery_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster token lookups
CREATE INDEX idx_delivery_receipts_token ON public.delivery_receipts(token);
CREATE INDEX idx_delivery_receipts_pedido ON public.delivery_receipts(pedido_id);