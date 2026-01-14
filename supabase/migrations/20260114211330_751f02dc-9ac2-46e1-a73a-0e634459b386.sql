-- Adicionar campo is_owner na tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false;