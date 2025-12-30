-- =====================================
-- ENUMS
-- =====================================
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE public.entity_type AS ENUM ('LOJA', 'PARTICULAR');
CREATE TYPE public.transaction_type AS ENUM ('PAGAR', 'RECEBER');
CREATE TYPE public.transaction_status AS ENUM ('PREVISTO', 'PAGO', 'ATRASADO', 'CANCELADO');
CREATE TYPE public.transaction_origin AS ENUM ('MANUAL', 'RECORRENTE', 'CARTAO', 'ASHBY', 'HORAS_EXTRAS', 'PEDIDO', 'BOLETO');
CREATE TYPE public.category_type AS ENUM ('DESPESA', 'RECEITA');
CREATE TYPE public.category_group AS ENUM ('FIXO', 'VARIAVEL', 'INVESTIMENTO');
CREATE TYPE public.ashby_status AS ENUM ('PENDENTE', 'ENTREGUE', 'PAGO', 'CANCELADO');
CREATE TYPE public.boleto_status AS ENUM ('PENDENTE', 'APROVADO', 'PAGO', 'REJEITADO', 'CANCELADO');
CREATE TYPE public.boleto_tipo_nota AS ENUM ('COM_NOTA', 'SEM_NOTA');
CREATE TYPE public.invoice_status AS ENUM ('ABERTA', 'FECHADA', 'PAGA');
CREATE TYPE public.recurrence_frequency AS ENUM ('MENSAL', 'SEMANAL', 'QUINZENAL', 'ANUAL');

-- =====================================
-- PROFILES TABLE
-- =====================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  cargo TEXT,
  avatar_url TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- =====================================
-- USER ROLES TABLE
-- =====================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================================
-- ENTITIES TABLE (LOJA, PARTICULAR)
-- =====================================
CREATE TABLE public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.entity_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage entities" ON public.entities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- ACCOUNTS TABLE
-- =====================================
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'CORRENTE',
  bank_name TEXT,
  agency TEXT,
  account_number TEXT,
  initial_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage accounts" ON public.accounts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- CATEGORIES TABLE
-- =====================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.category_type NOT NULL,
  category_group public.category_group DEFAULT 'VARIAVEL',
  parent_id UUID REFERENCES public.categories(id),
  icon TEXT,
  color TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage categories" ON public.categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- SUBCATEGORIES TABLE
-- =====================================
CREATE TABLE public.subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage subcategories" ON public.subcategories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- TRANSACTIONS TABLE
-- =====================================
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
  tipo public.transaction_type NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status public.transaction_status DEFAULT 'PREVISTO',
  origin public.transaction_origin DEFAULT 'MANUAL',
  origin_reference_id UUID,
  recurrence_id UUID,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage transactions" ON public.transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- RECORRENCIAS TABLE
-- =====================================
CREATE TABLE public.recorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  tipo public.transaction_type NOT NULL,
  frequency public.recurrence_frequency DEFAULT 'MENSAL',
  start_date DATE NOT NULL,
  end_date DATE,
  day_of_month INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  last_generated_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.recorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage recorrencias" ON public.recorrencias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- CREDIT CARDS TABLE
-- =====================================
CREATE TABLE public.credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  last_digits TEXT,
  brand TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  closing_day INTEGER DEFAULT 10,
  due_day INTEGER DEFAULT 20,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage credit_cards" ON public.credit_cards
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- CREDIT CARD INVOICES TABLE
-- =====================================
CREATE TABLE public.credit_card_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE NOT NULL,
  competencia DATE NOT NULL,
  closing_date DATE,
  due_date DATE,
  total_value DECIMAL(12,2) DEFAULT 0,
  status public.invoice_status DEFAULT 'ABERTA',
  payment_date DATE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(credit_card_id, competencia)
);

ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage credit_card_invoices" ON public.credit_card_invoices
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- CREDIT CARD TRANSACTIONS TABLE
-- =====================================
CREATE TABLE public.credit_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.credit_card_invoices(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  purchase_date DATE NOT NULL,
  competencia DATE NOT NULL,
  installment_number INTEGER DEFAULT 1,
  total_installments INTEGER DEFAULT 1,
  is_recurring BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage credit_card_transactions" ON public.credit_card_transactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- CREDIT CARD IMPORTS TABLE
-- =====================================
CREATE TABLE public.credit_card_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID REFERENCES public.credit_cards(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT,
  import_date TIMESTAMPTZ DEFAULT now(),
  records_imported INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_card_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage credit_card_imports" ON public.credit_card_imports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- BOLETOS TABLE
-- =====================================
CREATE TABLE public.boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL NOT NULL,
  description TEXT,
  beneficiario TEXT,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  tipo_nota public.boleto_tipo_nota DEFAULT 'SEM_NOTA',
  status public.boleto_status DEFAULT 'PENDENTE',
  image_base64 TEXT,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage boletos" ON public.boletos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- CLIENTES TABLE
-- =====================================
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  empresa TEXT,
  cpf_cnpj TEXT,
  endereco JSONB,
  status TEXT DEFAULT 'lead',
  origem TEXT NOT NULL,
  ticket_medio DECIMAL(12,2) DEFAULT 0,
  data_cadastro DATE DEFAULT CURRENT_DATE,
  ultimo_contato TIMESTAMPTZ,
  observacoes TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage clientes" ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- LEADS TABLE
-- =====================================
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  origem TEXT NOT NULL,
  status TEXT DEFAULT 'novo_lead',
  valor_estimado DECIMAL(12,2) DEFAULT 0,
  data_criacao DATE DEFAULT CURRENT_DATE,
  ultima_atualizacao TIMESTAMPTZ DEFAULT now(),
  observacoes TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage leads" ON public.leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- INTERACOES TABLE
-- =====================================
CREATE TABLE public.interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data TIMESTAMPTZ DEFAULT now(),
  responsavel TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage interacoes" ON public.interacoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- PRODUTOS TABLE
-- =====================================
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(12,2) NOT NULL DEFAULT 0,
  estoque INTEGER DEFAULT 0,
  categoria TEXT,
  sku TEXT,
  ativo BOOLEAN DEFAULT true,
  imagem_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage produtos" ON public.produtos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- MOVIMENTACOES ESTOQUE TABLE
-- =====================================
CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  quantidade_anterior INTEGER,
  quantidade_nova INTEGER,
  motivo TEXT,
  responsavel TEXT,
  referencia_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage movimentacoes_estoque" ON public.movimentacoes_estoque
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- PEDIDOS TABLE
-- =====================================
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  numero_pedido SERIAL,
  valor_total DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  metodo_pagamento TEXT,
  observacoes TEXT,
  data_pedido TIMESTAMPTZ DEFAULT now(),
  data_pagamento TIMESTAMPTZ,
  data_entrega TIMESTAMPTZ,
  endereco_entrega JSONB,
  historico JSONB DEFAULT '[]',
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage pedidos" ON public.pedidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- PEDIDO ITENS TABLE
-- =====================================
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage pedido_itens" ON public.pedido_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- EMPLOYEES TABLE
-- =====================================
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cargo TEXT,
  department TEXT,
  hourly_rate DECIMAL(12,2) DEFAULT 0,
  overtime_rate DECIMAL(12,2) DEFAULT 0,
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage employees" ON public.employees
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- TIMESHEET ENTRIES TABLE
-- =====================================
CREATE TABLE public.timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  entry_date DATE NOT NULL,
  entry_time TIME,
  exit_time TIME,
  break_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5,2) DEFAULT 0,
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'pendente',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.timesheet_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage timesheet_entries" ON public.timesheet_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- EXTRA HOURS SUMMARY VIEW/TABLE
-- =====================================
CREATE TABLE public.extra_hours_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  reference_month DATE NOT NULL,
  total_overtime_hours DECIMAL(6,2) DEFAULT 0,
  total_overtime_value DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pendente',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, reference_month)
);

ALTER TABLE public.extra_hours_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage extra_hours_summary" ON public.extra_hours_summary
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- ASHBY ORDERS TABLE
-- =====================================
CREATE TABLE public.ashby_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  order_date DATE,
  description TEXT,
  amount DECIMAL(12,2) DEFAULT 0,
  status public.ashby_status DEFAULT 'PENDENTE',
  payment_date DATE,
  delivery_date DATE,
  notes TEXT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ashby_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage ashby_orders" ON public.ashby_orders
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- TICKETS TABLE
-- =====================================
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  assunto TEXT NOT NULL,
  descricao TEXT NOT NULL,
  prioridade TEXT DEFAULT 'media',
  status TEXT DEFAULT 'aberto',
  data_abertura TIMESTAMPTZ DEFAULT now(),
  ultima_atualizacao TIMESTAMPTZ DEFAULT now(),
  anexos TEXT[],
  responsavel TEXT,
  resolucao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage tickets" ON public.tickets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- CAMPANHAS TABLE
-- =====================================
CREATE TABLE public.campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  data TIMESTAMPTZ DEFAULT now(),
  publico_alvo INTEGER DEFAULT 0,
  mensagens_enviadas INTEGER DEFAULT 0,
  mensagens_entregues INTEGER DEFAULT 0,
  mensagens_lidas INTEGER DEFAULT 0,
  respostas INTEGER DEFAULT 0,
  taxa_resposta DECIMAL(5,2) DEFAULT 0,
  conversoes INTEGER DEFAULT 0,
  taxa_conversao DECIMAL(5,2) DEFAULT 0,
  status TEXT DEFAULT 'agendada',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage campanhas" ON public.campanhas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- WHATSAPP INSTANCES TABLE
-- =====================================
CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'disconnected',
  phone_number TEXT,
  qr_code TEXT,
  last_connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage whatsapp_instances" ON public.whatsapp_instances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- WHATSAPP TEMPLATES TABLE
-- =====================================
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  categoria TEXT,
  variaveis TEXT[] DEFAULT '{}',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage whatsapp_templates" ON public.whatsapp_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- WHATSAPP CONVERSAS TABLE
-- =====================================
CREATE TABLE public.whatsapp_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  nome_contato TEXT NOT NULL,
  ultima_mensagem TEXT,
  ultima_interacao TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'ativa',
  nao_lida BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.whatsapp_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage whatsapp_conversas" ON public.whatsapp_conversas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- MENSAGENS WHATSAPP TABLE
-- =====================================
CREATE TABLE public.mensagens_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID REFERENCES public.whatsapp_conversas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  campanha_id UUID REFERENCES public.campanhas(id) ON DELETE SET NULL,
  nome_cliente TEXT,
  mensagem TEXT NOT NULL,
  status TEXT DEFAULT 'enviada',
  tipo TEXT DEFAULT 'enviada',
  lida BOOLEAN DEFAULT false,
  data_hora TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.mensagens_whatsapp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage mensagens_whatsapp" ON public.mensagens_whatsapp
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- EVOLUTION CHATS TABLE
-- =====================================
CREATE TABLE public.evolution_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  push_name TEXT,
  profile_pic_url TEXT,
  unread_count INTEGER DEFAULT 0,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  is_group BOOLEAN DEFAULT false,
  linked_to_chat_id UUID REFERENCES public.evolution_chats(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_name, remote_jid)
);

ALTER TABLE public.evolution_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage evolution_chats" ON public.evolution_chats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- EVOLUTION MESSAGES TABLE
-- =====================================
CREATE TABLE public.evolution_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES public.evolution_chats(id) ON DELETE SET NULL,
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  message_id TEXT NOT NULL,
  from_me BOOLEAN DEFAULT false,
  body TEXT,
  message_type TEXT DEFAULT 'text',
  media_url TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_name, message_id)
);

ALTER TABLE public.evolution_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage evolution_messages" ON public.evolution_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- WHATSAPP CONTACTS TABLE
-- =====================================
CREATE TABLE public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL,
  remote_jid TEXT NOT NULL,
  push_name TEXT,
  profile_pic_url TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_name, remote_jid)
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage whatsapp_contacts" ON public.whatsapp_contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================
-- TRIGGER: Auto update updated_at
-- =====================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recorrencias_updated_at BEFORE UPDATE ON public.recorrencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_credit_cards_updated_at BEFORE UPDATE ON public.credit_cards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_credit_card_invoices_updated_at BEFORE UPDATE ON public.credit_card_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_credit_card_transactions_updated_at BEFORE UPDATE ON public.credit_card_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boletos_updated_at BEFORE UPDATE ON public.boletos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_produtos_updated_at BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pedidos_updated_at BEFORE UPDATE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pedido_itens_updated_at BEFORE UPDATE ON public.pedido_itens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_timesheet_entries_updated_at BEFORE UPDATE ON public.timesheet_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_extra_hours_summary_updated_at BEFORE UPDATE ON public.extra_hours_summary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ashby_orders_updated_at BEFORE UPDATE ON public.ashby_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_instances_updated_at BEFORE UPDATE ON public.whatsapp_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_templates_updated_at BEFORE UPDATE ON public.whatsapp_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_conversas_updated_at BEFORE UPDATE ON public.whatsapp_conversas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evolution_chats_updated_at BEFORE UPDATE ON public.evolution_chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_contacts_updated_at BEFORE UPDATE ON public.whatsapp_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================
-- TRIGGER: Auto create profile on user signup
-- =====================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'nome');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================
-- TRIGGER: Deduct stock on order item insert
-- =====================================
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current stock
  SELECT estoque INTO current_stock FROM public.produtos WHERE id = NEW.produto_id;
  
  -- Update stock
  UPDATE public.produtos 
  SET estoque = estoque - NEW.quantidade
  WHERE id = NEW.produto_id;
  
  -- Record movement
  INSERT INTO public.movimentacoes_estoque (produto_id, tipo, quantidade, quantidade_anterior, quantidade_nova, motivo, referencia_id)
  VALUES (NEW.produto_id, 'saida', NEW.quantidade, current_stock, current_stock - NEW.quantidade, 'Venda - Pedido', NEW.pedido_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER deduct_stock_on_order_item_insert
  AFTER INSERT ON public.pedido_itens
  FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order_item();

-- =====================================
-- TRIGGER: Restore stock on order cancel
-- =====================================
CREATE OR REPLACE FUNCTION public.restore_stock_on_order_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  item RECORD;
  current_stock INTEGER;
BEGIN
  IF NEW.status = 'cancelado' AND (OLD.status IS NULL OR OLD.status != 'cancelado') THEN
    FOR item IN SELECT * FROM public.pedido_itens WHERE pedido_id = NEW.id LOOP
      -- Get current stock
      SELECT estoque INTO current_stock FROM public.produtos WHERE id = item.produto_id;
      
      -- Restore stock
      UPDATE public.produtos 
      SET estoque = estoque + item.quantidade
      WHERE id = item.produto_id;
      
      -- Record movement
      INSERT INTO public.movimentacoes_estoque (produto_id, tipo, quantidade, quantidade_anterior, quantidade_nova, motivo, referencia_id)
      VALUES (item.produto_id, 'entrada', item.quantidade, current_stock, current_stock + item.quantidade, 'Cancelamento de Pedido', NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER restore_stock_on_order_cancel
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_order_cancel();

-- =====================================
-- REALTIME: Enable for key tables
-- =====================================
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.pedidos REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.evolution_chats REPLICA IDENTITY FULL;
ALTER TABLE public.evolution_messages REPLICA IDENTITY FULL;

-- =====================================
-- SEED DATA: Entities
-- =====================================
INSERT INTO public.entities (name, type, description) VALUES
  ('Loja Taubaté Chopp', 'LOJA', 'Entidade principal da loja'),
  ('Particular', 'PARTICULAR', 'Finanças pessoais');

-- =====================================
-- SEED DATA: Default Categories
-- =====================================
INSERT INTO public.categories (name, type, category_group) VALUES
  ('Aluguel', 'DESPESA', 'FIXO'),
  ('Energia', 'DESPESA', 'FIXO'),
  ('Água', 'DESPESA', 'FIXO'),
  ('Internet/Telefone', 'DESPESA', 'FIXO'),
  ('Salários', 'DESPESA', 'FIXO'),
  ('Impostos', 'DESPESA', 'FIXO'),
  ('Fornecedores', 'DESPESA', 'VARIAVEL'),
  ('Manutenção', 'DESPESA', 'VARIAVEL'),
  ('Marketing', 'DESPESA', 'VARIAVEL'),
  ('Transporte', 'DESPESA', 'VARIAVEL'),
  ('Alimentação', 'DESPESA', 'VARIAVEL'),
  ('Material de Escritório', 'DESPESA', 'VARIAVEL'),
  ('Equipamentos', 'DESPESA', 'INVESTIMENTO'),
  ('Veículos', 'DESPESA', 'INVESTIMENTO'),
  ('Outros Gastos', 'DESPESA', 'VARIAVEL'),
  ('Vendas', 'RECEITA', 'VARIAVEL'),
  ('Serviços', 'RECEITA', 'VARIAVEL'),
  ('Comissões', 'RECEITA', 'VARIAVEL'),
  ('Investimentos', 'RECEITA', 'INVESTIMENTO'),
  ('Outras Receitas', 'RECEITA', 'VARIAVEL');

-- =====================================
-- SEED DATA: Default Accounts
-- =====================================
INSERT INTO public.accounts (entity_id, name, type, initial_balance, current_balance)
SELECT e.id, 'Caixa', 'CAIXA', 0, 0 FROM public.entities e WHERE e.type = 'LOJA';

INSERT INTO public.accounts (entity_id, name, type, initial_balance, current_balance)
SELECT e.id, 'Banco', 'CORRENTE', 0, 0 FROM public.entities e WHERE e.type = 'LOJA';

INSERT INTO public.accounts (entity_id, name, type, initial_balance, current_balance)
SELECT e.id, 'Conta Pessoal', 'CORRENTE', 0, 0 FROM public.entities e WHERE e.type = 'PARTICULAR';