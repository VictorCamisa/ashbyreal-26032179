-- Adicionar ENTRADA e ENCHIMENTO ao enum de tipo_movimento
ALTER TYPE barril_tipo_movimento ADD VALUE IF NOT EXISTS 'ENTRADA';
ALTER TYPE barril_tipo_movimento ADD VALUE IF NOT EXISTS 'ENCHIMENTO';