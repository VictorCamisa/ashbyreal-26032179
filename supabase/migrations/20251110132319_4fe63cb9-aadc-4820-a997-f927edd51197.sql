-- Função para criar lead automaticamente quando um cliente é criado
CREATE OR REPLACE FUNCTION public.criar_lead_ao_criar_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se já existe um lead com o mesmo telefone
  IF NOT EXISTS (
    SELECT 1 FROM public.leads 
    WHERE telefone = NEW.telefone
  ) THEN
    -- Insere o lead correspondente ao cliente
    INSERT INTO public.leads (
      nome,
      telefone,
      email,
      origem,
      status,
      valor_estimado,
      observacoes,
      data_criacao,
      ultima_atualizacao
    ) VALUES (
      NEW.nome,
      NEW.telefone,
      NEW.email,
      NEW.origem,
      CASE 
        WHEN NEW.status = 'ativo' THEN 'convertido'
        WHEN NEW.status = 'lead' THEN 'novo_lead'
        ELSE 'novo_lead'
      END,
      NEW.ticket_medio,
      NEW.observacoes,
      NEW.created_at,
      NEW.updated_at
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para executar a função após inserir um cliente
DROP TRIGGER IF EXISTS trigger_criar_lead_ao_criar_cliente ON public.clientes;

CREATE TRIGGER trigger_criar_lead_ao_criar_cliente
  AFTER INSERT ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_lead_ao_criar_cliente();