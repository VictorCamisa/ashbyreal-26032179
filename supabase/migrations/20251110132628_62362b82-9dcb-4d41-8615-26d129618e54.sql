-- Corrigir funções existentes adicionando search_path

-- Atualizar função calcular_margem_produto
CREATE OR REPLACE FUNCTION public.calcular_margem_produto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.preco_custo > 0 THEN
    NEW.margem_lucro := ((NEW.preco - NEW.preco_custo) / NEW.preco_custo) * 100;
  ELSE
    NEW.margem_lucro := 0;
  END IF;
  RETURN NEW;
END;
$function$;