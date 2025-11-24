-- Criar função para criar cliente ao criar lead
CREATE OR REPLACE FUNCTION public.criar_cliente_ao_criar_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se já existe um cliente com o mesmo telefone
  IF NOT EXISTS (
    SELECT 1 FROM public.clientes 
    WHERE telefone = NEW.telefone
  ) THEN
    -- Insere o cliente correspondente ao lead
    INSERT INTO public.clientes (
      nome,
      telefone,
      email,
      origem,
      status,
      ticket_medio,
      observacoes,
      data_cadastro,
      ultimo_contato
    ) VALUES (
      NEW.nome,
      NEW.telefone,
      NEW.email,
      NEW.origem,
      CASE 
        WHEN NEW.status = 'fechado' THEN 'ativo'
        WHEN NEW.status = 'perdido' THEN 'inativo'
        ELSE 'lead'
      END,
      COALESCE(NEW.valor_estimado, 0),
      NEW.observacoes,
      NEW.created_at,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para criar cliente ao criar lead
DROP TRIGGER IF EXISTS trigger_criar_cliente_ao_criar_lead ON public.leads;
CREATE TRIGGER trigger_criar_cliente_ao_criar_lead
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_cliente_ao_criar_lead();