-- Limpar todas as mensagens e chats da Evolution
DELETE FROM public.evolution_messages WHERE instance_name LIKE 'ashby%';
DELETE FROM public.evolution_chats WHERE instance_name LIKE 'ashby%';