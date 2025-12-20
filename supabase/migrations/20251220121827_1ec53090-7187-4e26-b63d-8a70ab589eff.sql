-- Corrigir instance_names que começam com "="
UPDATE whatsapp_instances 
SET instance_name = LTRIM(instance_name, '=')
WHERE instance_name LIKE '=%';

UPDATE evolution_chats 
SET instance_name = LTRIM(instance_name, '=')
WHERE instance_name LIKE '=%';

UPDATE evolution_messages 
SET instance_name = LTRIM(instance_name, '=')
WHERE instance_name LIKE '=%';