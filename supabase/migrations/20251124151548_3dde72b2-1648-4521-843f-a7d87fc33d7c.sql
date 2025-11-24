-- Criar função para sincronizar lead convertido com cliente
CREATE OR REPLACE FUNCTION public.sincronizar_lead_para_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cliente_existente_id uuid;
BEGIN
  -- Buscar cliente existente pelo telefone
  SELECT id INTO cliente_existente_id
  FROM public.clientes
  WHERE telefone = NEW.telefone
  LIMIT 1;

  -- Se o lead foi convertido (fechado), atualizar ou criar cliente
  IF NEW.status = 'fechado' THEN
    IF cliente_existente_id IS NOT NULL THEN
      -- Atualizar cliente existente
      UPDATE public.clientes
      SET
        nome = NEW.nome,
        email = COALESCE(NEW.email, email),
        status = 'ativo',
        origem = NEW.origem,
        ticket_medio = COALESCE(NEW.valor_estimado, ticket_medio),
        observacoes = COALESCE(NEW.observacoes, observacoes),
        ultimo_contato = now(),
        updated_at = now()
      WHERE id = cliente_existente_id;
    ELSE
      -- Criar novo cliente
      INSERT INTO public.clientes (
        nome,
        email,
        telefone,
        origem,
        status,
        ticket_medio,
        observacoes,
        data_cadastro,
        ultimo_contato
      ) VALUES (
        NEW.nome,
        NEW.email,
        NEW.telefone,
        NEW.origem,
        'ativo',
        COALESCE(NEW.valor_estimado, 0),
        NEW.observacoes,
        now(),
        now()
      );
    END IF;
  -- Se o lead está em negociação ou qualificado, manter como lead no cliente
  ELSIF NEW.status IN ('negociacao', 'qualificado') THEN
    IF cliente_existente_id IS NOT NULL THEN
      UPDATE public.clientes
      SET
        nome = NEW.nome,
        email = COALESCE(NEW.email, email),
        status = 'lead',
        origem = NEW.origem,
        ticket_medio = COALESCE(NEW.valor_estimado, ticket_medio),
        observacoes = COALESCE(NEW.observacoes, observacoes),
        ultimo_contato = now(),
        updated_at = now()
      WHERE id = cliente_existente_id;
    END IF;
  -- Se o lead foi perdido, marcar cliente como inativo
  ELSIF NEW.status = 'perdido' AND cliente_existente_id IS NOT NULL THEN
    UPDATE public.clientes
    SET
      status = 'inativo',
      ultimo_contato = now(),
      updated_at = now()
    WHERE id = cliente_existente_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para sincronizar lead com cliente
DROP TRIGGER IF EXISTS trigger_sincronizar_lead_para_cliente ON public.leads;
CREATE TRIGGER trigger_sincronizar_lead_para_cliente
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sincronizar_lead_para_cliente();

-- Também atualizar quando dados do lead mudam (não só status)
DROP TRIGGER IF EXISTS trigger_atualizar_cliente_de_lead ON public.leads;
CREATE TRIGGER trigger_atualizar_cliente_de_lead
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (
    OLD.nome IS DISTINCT FROM NEW.nome OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.telefone IS DISTINCT FROM NEW.telefone OR
    OLD.valor_estimado IS DISTINCT FROM NEW.valor_estimado OR
    OLD.observacoes IS DISTINCT FROM NEW.observacoes
  )
  EXECUTE FUNCTION public.sincronizar_lead_para_cliente();