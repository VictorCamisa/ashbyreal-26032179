-- Enum para tipos de documento fiscal
CREATE TYPE public.documento_fiscal_tipo AS ENUM (
  'NFE',        -- NF-e Produto
  'NFSE',       -- NFS-e Serviço
  'CFE_SAT',    -- CF-e / SAT
  'NFCE'        -- NFC-e Consumidor
);

-- Enum para status do documento fiscal
CREATE TYPE public.documento_fiscal_status AS ENUM (
  'RASCUNHO',
  'PENDENTE_EMISSAO',
  'EMITIDA',
  'CANCELADA',
  'REJEITADA',
  'INUTILIZADA'
);

-- Enum para direção do documento (entrada/saída)
CREATE TYPE public.documento_fiscal_direcao AS ENUM (
  'ENTRADA',   -- Notas de compra (fornecedores)
  'SAIDA'      -- Notas de venda (clientes)
);

-- Tabela principal de documentos fiscais
CREATE TABLE public.documentos_fiscais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo documento_fiscal_tipo NOT NULL,
  direcao documento_fiscal_direcao NOT NULL DEFAULT 'SAIDA',
  status documento_fiscal_status NOT NULL DEFAULT 'RASCUNHO',
  
  -- Numeração
  numero TEXT,
  serie TEXT DEFAULT '1',
  chave_acesso TEXT,
  
  -- Datas
  data_emissao TIMESTAMP WITH TIME ZONE,
  data_competencia DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Valores
  valor_produtos NUMERIC NOT NULL DEFAULT 0,
  valor_servicos NUMERIC NOT NULL DEFAULT 0,
  valor_desconto NUMERIC NOT NULL DEFAULT 0,
  valor_frete NUMERIC NOT NULL DEFAULT 0,
  valor_outras NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  
  -- Impostos
  valor_icms NUMERIC DEFAULT 0,
  valor_ipi NUMERIC DEFAULT 0,
  valor_pis NUMERIC DEFAULT 0,
  valor_cofins NUMERIC DEFAULT 0,
  valor_iss NUMERIC DEFAULT 0,
  
  -- Relacionamentos
  cliente_id UUID REFERENCES public.clientes(id),
  lojista_id UUID REFERENCES public.lojistas(id),
  pedido_id UUID REFERENCES public.pedidos(id),
  boleto_id UUID REFERENCES public.boletos(id),
  entity_id UUID REFERENCES public.entities(id),
  
  -- Dados adicionais
  natureza_operacao TEXT DEFAULT 'Venda de mercadoria',
  informacoes_adicionais TEXT,
  xml_content TEXT,
  pdf_url TEXT,
  
  -- Dados do emitente/destinatário para notas de entrada
  razao_social TEXT,
  cnpj_cpf TEXT,
  inscricao_estadual TEXT,
  endereco JSONB,
  
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  emitida_por UUID,
  cancelada_por UUID,
  motivo_cancelamento TEXT
);

-- Itens do documento fiscal
CREATE TABLE public.documento_fiscal_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento_id UUID NOT NULL REFERENCES public.documentos_fiscais(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  
  -- Descrição do item
  codigo TEXT,
  descricao TEXT NOT NULL,
  ncm TEXT,
  cfop TEXT,
  unidade TEXT DEFAULT 'UN',
  
  -- Valores
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  
  -- Impostos
  icms_aliquota NUMERIC DEFAULT 0,
  icms_valor NUMERIC DEFAULT 0,
  ipi_aliquota NUMERIC DEFAULT 0,
  ipi_valor NUMERIC DEFAULT 0,
  pis_aliquota NUMERIC DEFAULT 0,
  pis_valor NUMERIC DEFAULT 0,
  cofins_aliquota NUMERIC DEFAULT 0,
  cofins_valor NUMERIC DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de alertas contábeis
CREATE TABLE public.contabilidade_alertas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'ENTRADA_SEM_NF', 'SAIDA_SEM_NF', 'DIVERGENCIA_VALOR', 'NF_PENDENTE', etc.
  prioridade TEXT NOT NULL DEFAULT 'MEDIA', -- 'BAIXA', 'MEDIA', 'ALTA', 'CRITICA'
  status TEXT NOT NULL DEFAULT 'PENDENTE', -- 'PENDENTE', 'RESOLVIDO', 'IGNORADO'
  
  titulo TEXT NOT NULL,
  descricao TEXT,
  
  -- Referências
  boleto_id UUID REFERENCES public.boletos(id),
  pedido_id UUID REFERENCES public.pedidos(id),
  documento_id UUID REFERENCES public.documentos_fiscais(id),
  transaction_id UUID REFERENCES public.transactions(id),
  
  -- Valores para divergências
  valor_esperado NUMERIC,
  valor_encontrado NUMERIC,
  diferenca NUMERIC,
  
  -- Resolução
  resolvido_em TIMESTAMP WITH TIME ZONE,
  resolvido_por UUID,
  resolucao_notas TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Configurações de contabilidade
CREATE TABLE public.contabilidade_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID REFERENCES public.entities(id),
  
  -- Dados fiscais
  regime_tributario TEXT DEFAULT 'SIMPLES_NACIONAL', -- 'SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'
  cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  
  -- Configurações de série
  serie_nfe TEXT DEFAULT '1',
  serie_nfse TEXT DEFAULT '1',
  serie_nfce TEXT DEFAULT '1',
  
  -- Último número usado
  ultimo_numero_nfe INTEGER DEFAULT 0,
  ultimo_numero_nfse INTEGER DEFAULT 0,
  ultimo_numero_nfce INTEGER DEFAULT 0,
  
  -- Configurações de alerta
  alerta_entrada_sem_nf BOOLEAN DEFAULT true,
  alerta_saida_sem_nf BOOLEAN DEFAULT true,
  alerta_divergencia_valor BOOLEAN DEFAULT true,
  tolerancia_divergencia NUMERIC DEFAULT 0.01, -- 1% de tolerância
  
  -- Dados para integração futura
  api_provider TEXT, -- 'NFE_IO', 'FOCUS_NFE', 'WEBMANIA'
  api_key TEXT,
  ambiente TEXT DEFAULT 'HOMOLOGACAO', -- 'HOMOLOGACAO', 'PRODUCAO'
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.documentos_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documento_fiscal_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilidade_alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contabilidade_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can manage documentos_fiscais" 
ON public.documentos_fiscais FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage documento_fiscal_itens" 
ON public.documento_fiscal_itens FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage contabilidade_alertas" 
ON public.contabilidade_alertas FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Authenticated users can manage contabilidade_config" 
ON public.contabilidade_config FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_documentos_fiscais_updated_at
BEFORE UPDATE ON public.documentos_fiscais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contabilidade_alertas_updated_at
BEFORE UPDATE ON public.contabilidade_alertas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contabilidade_config_updated_at
BEFORE UPDATE ON public.contabilidade_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_documentos_fiscais_tipo ON public.documentos_fiscais(tipo);
CREATE INDEX idx_documentos_fiscais_status ON public.documentos_fiscais(status);
CREATE INDEX idx_documentos_fiscais_direcao ON public.documentos_fiscais(direcao);
CREATE INDEX idx_documentos_fiscais_data ON public.documentos_fiscais(data_competencia);
CREATE INDEX idx_documentos_fiscais_boleto ON public.documentos_fiscais(boleto_id);
CREATE INDEX idx_documentos_fiscais_pedido ON public.documentos_fiscais(pedido_id);
CREATE INDEX idx_contabilidade_alertas_status ON public.contabilidade_alertas(status);
CREATE INDEX idx_contabilidade_alertas_tipo ON public.contabilidade_alertas(tipo);