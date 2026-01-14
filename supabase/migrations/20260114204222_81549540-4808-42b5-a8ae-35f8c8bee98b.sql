-- Corrigir a regra de copos no prompt do agente Lara
UPDATE public.ai_agents
SET 
  system_prompt = REPLACE(
    system_prompt, 
    '===== COPOS =====
- Pergunte sobre copos NO FINAL, quando já souber a quantidade de litros
- Informe: "Temos pacotes com 10 unidades do copo de 300ml, próprio para chopp"',
    '===== COPOS =====
- Pergunte sobre copos NO FINAL, quando já souber a quantidade de pessoas
- Sugerir 1 a 2 copos por pessoa no MÁXIMO
- Copos vêm em pacotes de 10 unidades (copo de 300ml próprio para chopp)
- Exemplo: 50 pessoas = 5 a 10 pacotes (50 a 100 copos)'
  ),
  updated_at = now()
WHERE name = 'Lara - Atendente Virtual' OR is_active = true;