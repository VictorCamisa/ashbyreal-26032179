-- Atualizar o push_name do chat que tem o número 5511965734341
UPDATE public.evolution_chats 
SET push_name = 'Victor Camisa'
WHERE remote_jid = '5511965734341@s.whatsapp.net'
AND instance_name = 'ashby-1765310252844';