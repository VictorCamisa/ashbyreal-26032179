-- Guardar número real (PN) quando o chat vier em formato @lid
ALTER TABLE public.evolution_chats
ADD COLUMN IF NOT EXISTS phone_number text;

-- Ajuda a buscar/relacionar rapidamente por instância + número
CREATE INDEX IF NOT EXISTS idx_evolution_chats_instance_phone
ON public.evolution_chats (instance_name, phone_number);
