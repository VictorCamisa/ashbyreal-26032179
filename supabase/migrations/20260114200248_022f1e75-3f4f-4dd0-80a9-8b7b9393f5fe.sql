-- Primeiro deletar as mensagens (que têm FK para conversas)
DELETE FROM public.ai_messages;

-- Depois deletar as conversas
DELETE FROM public.ai_conversations;