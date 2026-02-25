
-- Table to link Pluggy Items to credit cards
CREATE TABLE public.pluggy_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  pluggy_item_id TEXT NOT NULL,
  pluggy_account_id TEXT,
  connector_name TEXT,
  connector_id INTEGER,
  status TEXT DEFAULT 'ACTIVE',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pluggy_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage pluggy_items"
ON public.pluggy_items FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_pluggy_items_updated_at
BEFORE UPDATE ON public.pluggy_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
