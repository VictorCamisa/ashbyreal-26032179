-- Adicionar campo de voz do ElevenLabs na tabela ai_agents
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS elevenlabs_voice_id TEXT DEFAULT 'XrExE9yKIg1WjnnlVkGX';

-- Comentário explicativo
COMMENT ON COLUMN public.ai_agents.elevenlabs_voice_id IS 'ID da voz do ElevenLabs para respostas em áudio';