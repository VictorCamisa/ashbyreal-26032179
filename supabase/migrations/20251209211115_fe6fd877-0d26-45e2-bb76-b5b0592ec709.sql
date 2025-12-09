-- Adicionar campo para vincular chats como sendo do mesmo contato
ALTER TABLE public.evolution_chats
ADD COLUMN IF NOT EXISTS linked_to_chat_id uuid REFERENCES public.evolution_chats(id) ON DELETE SET NULL;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_evolution_chats_linked ON public.evolution_chats(linked_to_chat_id);