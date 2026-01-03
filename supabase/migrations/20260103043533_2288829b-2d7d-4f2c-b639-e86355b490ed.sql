-- Limpar chats duplicados mantendo apenas o mais recente de cada canonical_jid
DELETE FROM evolution_chats a
USING evolution_chats b
WHERE a.canonical_jid = b.canonical_jid 
  AND a.instance_name = b.instance_name
  AND a.created_at < b.created_at;

-- Limpar mensagens órfãs (sem chat associado)
DELETE FROM evolution_messages 
WHERE chat_id NOT IN (SELECT id FROM evolution_chats);