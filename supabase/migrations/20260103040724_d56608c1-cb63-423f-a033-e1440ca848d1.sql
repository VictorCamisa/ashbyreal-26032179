-- Add canonical thread columns to evolution_chats
ALTER TABLE public.evolution_chats 
ADD COLUMN IF NOT EXISTS canonical_jid text,
ADD COLUMN IF NOT EXISTS lid_jid text,
ADD COLUMN IF NOT EXISTS pn_jid text;

-- Update existing records: set canonical_jid from remote_jid
UPDATE public.evolution_chats 
SET canonical_jid = remote_jid 
WHERE canonical_jid IS NULL;

-- Make canonical_jid NOT NULL after populating
ALTER TABLE public.evolution_chats 
ALTER COLUMN canonical_jid SET NOT NULL;

-- Add unique constraint for canonical thread identification
ALTER TABLE public.evolution_chats 
DROP CONSTRAINT IF EXISTS evolution_chats_instance_canonical_unique;

ALTER TABLE public.evolution_chats 
ADD CONSTRAINT evolution_chats_instance_canonical_unique 
UNIQUE (instance_name, canonical_jid);

-- Add source_remote_jid to evolution_messages for debugging
ALTER TABLE public.evolution_messages 
ADD COLUMN IF NOT EXISTS source_remote_jid text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_evolution_chats_canonical 
ON public.evolution_chats(instance_name, canonical_jid);

CREATE INDEX IF NOT EXISTS idx_evolution_messages_chat_id 
ON public.evolution_messages(chat_id);