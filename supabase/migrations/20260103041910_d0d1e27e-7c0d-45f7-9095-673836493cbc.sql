-- Fix any existing chats that don't have canonical_jid populated
UPDATE public.evolution_chats 
SET canonical_jid = remote_jid 
WHERE canonical_jid IS NULL OR canonical_jid = '';

-- Also populate phone_number for non-lid JIDs that don't have it
UPDATE public.evolution_chats 
SET phone_number = SPLIT_PART(REPLACE(REPLACE(remote_jid, '@s.whatsapp.net', ''), '@c.us', ''), '@', 1)
WHERE phone_number IS NULL 
  AND remote_jid NOT LIKE '%@lid%' 
  AND remote_jid NOT LIKE '%@g.us%';