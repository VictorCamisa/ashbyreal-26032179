-- =============================================================================
-- Jarvis — base vetorial do sistema
--
-- Estratégia: cada entidade de negócio vira UM documento de texto denormalizado
-- ("card"), já com o contexto cruzado que o agente precisaria juntar na mão
-- (cliente + histórico de pedidos, pedido + itens + cliente, produto + giro...).
-- O texto é derivado de uma view sobre os dados vivos, então nunca desatualiza:
-- o refresh recalcula o hash e só re-embeda o que mudou.
-- =============================================================================

create extension if not exists vector with schema extensions;

-- -----------------------------------------------------------------------------
-- Helpers de formatação — o texto é lido por um LLM, então usa o formato que o
-- usuário fala: R$ 1.234,56 e 17/09/2026.
-- -----------------------------------------------------------------------------
create or replace function public.jarvis_money(v numeric)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when v is null then 'não informado'
    else 'R$ ' || replace(replace(replace(to_char(v, 'FM999,999,999,990.00'), ',', '|'), '.', ','), '|', '.')
  end;
$$;

create or replace function public.jarvis_date(d anyelement)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(to_char(d::timestamptz, 'DD/MM/YYYY'), 'sem data');
$$;

-- -----------------------------------------------------------------------------
-- Tabela de documentos
-- -----------------------------------------------------------------------------
create table if not exists public.jarvis_documents (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null,
  source_table   text not null,
  source_id      text not null,
  title          text not null,
  content        text not null,
  metadata       jsonb not null default '{}'::jsonb,
  content_hash   text not null,
  embedding      extensions.vector(1536),
  embedded_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  fts tsvector generated always as (
    to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) stored,
  constraint jarvis_documents_source_uniq unique (source_table, source_id)
);

comment on table public.jarvis_documents is
  'Base vetorial do Jarvis: um documento de texto por entidade de negócio, com embedding e busca full-text.';

create index if not exists jarvis_documents_kind_idx on public.jarvis_documents (kind);
create index if not exists jarvis_documents_fts_idx  on public.jarvis_documents using gin (fts);
create index if not exists jarvis_documents_pending_idx
  on public.jarvis_documents (updated_at) where embedding is null;
create index if not exists jarvis_documents_embedding_idx
  on public.jarvis_documents using hnsw (embedding extensions.vector_cosine_ops);

alter table public.jarvis_documents enable row level security;

drop policy if exists "Usuários autenticados leem a base do Jarvis" on public.jarvis_documents;
create policy "Usuários autenticados leem a base do Jarvis"
  on public.jarvis_documents for select
  to authenticated
  using (true);

-- Escrita só pela service_role (edge functions) — sem policy de insert/update.

-- -----------------------------------------------------------------------------
-- Construtores de documento
-- Uma view única que devolve, para cada entidade, o card de texto pronto.
-- -----------------------------------------------------------------------------
create or replace view public.jarvis_document_source as

-- CLIENTES: identificação + histórico de compras consolidado
with pedidos_por_cliente as (
  select
    p.cliente_id,
    count(*)                                        as total_pedidos,
    sum(coalesce(p.valor_total, 0))                 as faturamento,
    avg(coalesce(p.valor_total, 0))                 as ticket_medio,
    max(p.data_pedido)                              as ultimo_pedido,
    min(p.data_pedido)                              as primeiro_pedido,
    count(*) filter (where p.status = 'pendente')   as pedidos_pendentes
  from public.pedidos p
  where p.cliente_id is not null
  group by p.cliente_id
),
produtos_por_cliente as (
  select
    p.cliente_id,
    string_agg(distinct pr.nome, ', ') as produtos
  from public.pedidos p
  join public.pedido_itens pi on pi.pedido_id = p.id
  join public.produtos pr     on pr.id = pi.produto_id
  where p.cliente_id is not null
  group by p.cliente_id
)
select
  'cliente'::text as kind,
  'clientes'::text as source_table,
  c.id::text as source_id,
  ('Cliente: ' || c.nome || coalesce(' (' || c.empresa || ')', ''))::text as title,
  concat_ws(E'\n',
    'Cliente: ' || c.nome || coalesce(' — empresa: ' || c.empresa, ''),
    'Status: ' || coalesce(c.status, 'não informado') || ' · Origem: ' || coalesce(c.origem, 'não informada')
      || ' · Cadastro: ' || public.jarvis_date(coalesce(c.data_cadastro, c.created_at)),
    'Contato: ' || coalesce(c.email, 'sem e-mail') || ' · ' || coalesce(c.telefone, 'sem telefone')
      || coalesce(' · CPF/CNPJ: ' || c.cpf_cnpj, ''),
    case when c.endereco is not null and c.endereco::text <> 'null'
      then 'Endereço: ' || concat_ws(', ',
        nullif(c.endereco->>'logradouro', ''), nullif(c.endereco->>'numero', ''),
        nullif(c.endereco->>'bairro', ''), nullif(c.endereco->>'cidade', ''),
        nullif(c.endereco->>'estado', ''), nullif(c.endereco->>'cep', ''))
    end,
    case when pc.total_pedidos is not null then
      'Histórico de compras: ' || pc.total_pedidos || ' pedidos · faturamento total '
        || public.jarvis_money(pc.faturamento)
        || ' · ticket médio ' || public.jarvis_money(pc.ticket_medio)
    else 'Histórico de compras: nenhum pedido registrado' end,
    case when pc.ultimo_pedido is not null then
      'Último pedido em ' || public.jarvis_date(pc.ultimo_pedido)
        || ' (' || (current_date - pc.ultimo_pedido::date) || ' dias atrás)'
        || ' · primeiro pedido em ' || public.jarvis_date(pc.primeiro_pedido)
        || case when pc.pedidos_pendentes > 0
             then ' · ' || pc.pedidos_pendentes || ' pedidos ainda pendentes' else '' end
    end,
    case when prc.produtos is not null then 'Produtos já comprados: ' || prc.produtos end,
    case when c.ticket_medio is not null then 'Ticket médio cadastrado: ' || public.jarvis_money(c.ticket_medio) end,
    case when c.ultimo_contato is not null then 'Último contato: ' || public.jarvis_date(c.ultimo_contato) end,
    case when nullif(c.observacoes, '') is not null then 'Observações: ' || c.observacoes end
  )::text as content,
  jsonb_strip_nulls(jsonb_build_object(
    'cliente_id', c.id,
    'nome', c.nome,
    'empresa', c.empresa,
    'status', c.status,
    'telefone', c.telefone,
    'email', c.email,
    'total_pedidos', pc.total_pedidos,
    'faturamento_total', pc.faturamento,
    'ultimo_pedido', pc.ultimo_pedido,
    'dias_sem_comprar', case when pc.ultimo_pedido is not null
      then current_date - pc.ultimo_pedido::date end,
    'href', '/clientes/' || c.id
  )) as metadata
from public.clientes c
left join pedidos_por_cliente pc  on pc.cliente_id = c.id
left join produtos_por_cliente prc on prc.cliente_id = c.id

union all

-- PEDIDOS: itens, cliente, lojista, valores e status na mesma página
select
  'pedido',
  'pedidos',
  p.id::text,
  ('Pedido #' || p.numero_pedido || coalesce(' — ' || c.nome, ''))::text,
  concat_ws(E'\n',
    'Pedido #' || p.numero_pedido
      || coalesce(' (externo ' || p.numero_pedido_externo || ')', '')
      || coalesce(' — cliente: ' || c.nome, ' — sem cliente vinculado')
      || coalesce(' — lojista: ' || l.nome, ''),
    'Data do pedido: ' || public.jarvis_date(p.data_pedido)
      || ' · Entrega: ' || public.jarvis_date(p.data_entrega)
      || ' · Status: ' || coalesce(p.status, 'não informado'),
    'Valor total: ' || public.jarvis_money(p.valor_total)
      || ' · Sinal: ' || public.jarvis_money(p.valor_sinal)
      || ' · Pagamento: ' || coalesce(p.metodo_pagamento, 'não informado')
      || case when p.data_pagamento is not null
           then ' (pago em ' || public.jarvis_date(p.data_pagamento) || ')'
           else ' (sem data de pagamento)' end,
    case when itens.linhas is not null then 'Itens: ' || itens.linhas end,
    case when itens.litros > 0 then 'Volume total: ' || itens.litros || ' litros' end,
    case when p.endereco_entrega is not null and p.endereco_entrega::text <> 'null'
      then 'Entrega em: ' || concat_ws(', ',
        nullif(p.endereco_entrega->>'logradouro', ''), nullif(p.endereco_entrega->>'numero', ''),
        nullif(p.endereco_entrega->>'bairro', ''), nullif(p.endereco_entrega->>'cidade', ''))
    end,
    case when nullif(p.observacoes, '') is not null then 'Observações: ' || p.observacoes end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'pedido_id', p.id,
    'numero_pedido', p.numero_pedido,
    'cliente_id', p.cliente_id,
    'cliente_nome', c.nome,
    'lojista_id', p.lojista_id,
    'status', p.status,
    'valor_total', p.valor_total,
    'data_pedido', p.data_pedido,
    'litros', itens.litros,
    'href', '/pedidos'
  ))
from public.pedidos p
left join public.clientes c on c.id = p.cliente_id
left join public.lojistas l on l.id = p.lojista_id
left join lateral (
  select
    string_agg(
      pi.quantidade || '× ' || coalesce(pr.nome, 'produto removido')
        || ' a ' || public.jarvis_money(pi.preco_unitario)
        || ' = ' || public.jarvis_money(pi.subtotal)
        || coalesce(' (' || nullif(pi.observacoes, '') || ')', ''),
      '; ' order by pi.created_at
    ) as linhas,
    coalesce(sum(pi.quantidade * coalesce(pr.capacidade_barril, 0)), 0) as litros
  from public.pedido_itens pi
  left join public.produtos pr on pr.id = pi.produto_id
  where pi.pedido_id = p.id
) itens on true

union all

-- PRODUTOS: preço, margem, estoque e giro real dos últimos 90 dias
select
  'produto',
  'produtos',
  pr.id::text,
  ('Produto: ' || pr.nome)::text,
  concat_ws(E'\n',
    'Produto: ' || pr.nome || coalesce(' (SKU ' || pr.sku || ')', '')
      || ' · Categoria: ' || coalesce(pr.categoria, 'não informada')
      || ' · Tipo: ' || coalesce(pr.tipo_produto, 'não informado'),
    case when nullif(pr.descricao, '') is not null then 'Descrição: ' || pr.descricao end,
    'Preço de venda: ' || public.jarvis_money(pr.preco)
      || ' · Custo: ' || public.jarvis_money(pr.preco_custo)
      || coalesce(' · Margem: ' || round(pr.margem_lucro::numeric, 2) || '%', ''),
    'Estoque atual: ' || coalesce(pr.estoque, 0) || ' ' || coalesce(pr.unidade_medida, 'un')
      || coalesce(' (' || pr.estoque_litros || ' litros)', '')
      || ' · Estoque mínimo: ' || coalesce(pr.estoque_minimo, 0)
      || case when coalesce(pr.estoque, 0) <= coalesce(pr.estoque_minimo, 0)
           then ' · ATENÇÃO: abaixo do mínimo' else '' end,
    nullif(concat_ws(' · ',
      nullif('Fornecedor: ' || coalesce(pr.fornecedor, ''), 'Fornecedor: '),
      nullif('Localização: ' || coalesce(pr.localizacao, ''), 'Localização: ')), ''),
    'Situação: ' || case when coalesce(pr.ativo, true) then 'ativo' else 'inativo' end,
    case when vendas.qtd is not null then
      'Vendas nos últimos 90 dias: ' || vendas.qtd || ' unidades em ' || vendas.pedidos
        || ' pedidos, ' || public.jarvis_money(vendas.receita) || ' de receita'
    else 'Sem vendas registradas nos últimos 90 dias' end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'produto_id', pr.id,
    'nome', pr.nome,
    'preco', pr.preco,
    'estoque', pr.estoque,
    'estoque_minimo', pr.estoque_minimo,
    'abaixo_do_minimo', coalesce(pr.estoque, 0) <= coalesce(pr.estoque_minimo, 0),
    'href', '/estoque'
  ))
from public.produtos pr
left join lateral (
  select sum(pi.quantidade) as qtd,
         count(distinct pi.pedido_id) as pedidos,
         sum(pi.subtotal) as receita
  from public.pedido_itens pi
  join public.pedidos p on p.id = pi.pedido_id
  where pi.produto_id = pr.id
    and p.data_pedido >= current_date - 90
) vendas on true

union all

-- LOJISTAS: dados fiscais + relação comercial
select
  'lojista',
  'lojistas',
  l.id::text,
  ('Lojista: ' || l.nome)::text,
  concat_ws(E'\n',
    'Lojista: ' || l.nome || coalesce(' (fantasia: ' || l.nome_fantasia || ')', '')
      || coalesce(' — razão social: ' || l.razao_social, ''),
    'Status: ' || coalesce(l.status, 'não informado')
      || ' · Cadastro: ' || public.jarvis_date(coalesce(l.data_cadastro, l.created_at)),
    'Contato: ' || coalesce(l.contato_responsavel, 'sem responsável')
      || ' · ' || coalesce(l.telefone, 'sem telefone')
      || coalesce(' / ' || l.telefone_secundario, '')
      || coalesce(' · ' || l.email, ''),
    'Dados fiscais: ' || coalesce('CNPJ ' || l.cnpj, 'sem CNPJ')
      || coalesce(' · IE ' || l.inscricao_estadual, '')
      || coalesce(' · regime ' || l.regime_tributario, '')
      || coalesce(' · ICMS ' || l.contribuinte_icms, ''),
    case when l.endereco is not null and l.endereco::text <> 'null'
      then 'Endereço: ' || concat_ws(', ',
        nullif(l.endereco->>'logradouro', ''), nullif(l.endereco->>'numero', ''),
        nullif(l.endereco->>'bairro', ''), nullif(l.endereco->>'cidade', ''),
        nullif(l.endereco->>'estado', ''))
    end,
    case when ped.total is not null then
      'Pedidos vinculados: ' || ped.total || ' · faturamento ' || public.jarvis_money(ped.valor)
        || ' · último em ' || public.jarvis_date(ped.ultimo)
    else 'Nenhum pedido vinculado' end,
    case when nullif(l.observacoes, '') is not null then 'Observações: ' || l.observacoes end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'lojista_id', l.id,
    'nome', l.nome,
    'cnpj', l.cnpj,
    'status', l.status,
    'total_pedidos', ped.total,
    'href', '/lojistas/' || l.id
  ))
from public.lojistas l
left join lateral (
  select count(*) as total, sum(coalesce(p.valor_total, 0)) as valor, max(p.data_pedido) as ultimo
  from public.pedidos p where p.lojista_id = l.id
) ped on true

union all

-- TRANSAÇÕES FINANCEIRAS: o que é, de quem, quando vence, como está
select
  'transacao',
  'transactions',
  t.id::text,
  ('Lançamento ' || case t.tipo when 'PAGAR' then 'a pagar' else 'a receber' end
    || ': ' || t.description)::text,
  concat_ws(E'\n',
    'Lançamento financeiro do tipo '
      || case t.tipo when 'PAGAR' then 'conta a pagar (despesa)' else 'conta a receber (receita)' end
      || ': ' || t.description,
    'Valor: ' || public.jarvis_money(t.amount)
      || ' · Vencimento: ' || public.jarvis_date(t.due_date)
      || ' · Status: ' || coalesce(t.status::text, 'não informado')
      || case when t.payment_date is not null
           then ' · Pago em ' || public.jarvis_date(t.payment_date)
           else ' · Ainda não pago' end,
    case when t.due_date < current_date and t.payment_date is null
              and coalesce(t.status::text, '') not in ('PAGO', 'CANCELADO')
      then 'ATENÇÃO: em atraso há ' || (current_date - t.due_date::date) || ' dias' end,
    concat_ws(' · ',
      nullif('Categoria: ' || coalesce(cat.name, ''), 'Categoria: '),
      nullif('Subcategoria: ' || coalesce(sub.name, ''), 'Subcategoria: '),
      nullif('Conta: ' || coalesce(acc.name, ''), 'Conta: '),
      nullif('Entidade: ' || coalesce(ent.name, ''), 'Entidade: ')),
    case when t.reference_month is not null
      then 'Competência: ' || to_char(t.reference_month, 'MM/YYYY') end,
    case when t.tags is not null and array_length(t.tags, 1) > 0
      then 'Tags: ' || array_to_string(t.tags, ', ') end,
    case when t.origin is not null then 'Origem: ' || t.origin::text end,
    case when nullif(t.notes, '') is not null then 'Notas: ' || t.notes end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'transaction_id', t.id,
    'tipo', t.tipo::text,
    'natureza', case t.tipo when 'PAGAR' then 'despesa' else 'receita' end,
    'amount', t.amount,
    'due_date', t.due_date,
    'status', t.status::text,
    'categoria', cat.name,
    'entidade', ent.name,
    'href', '/financeiro'
  ))
from public.transactions t
left join public.categories    cat on cat.id = t.category_id
left join public.subcategories sub on sub.id = t.subcategory_id
left join public.accounts      acc on acc.id = t.account_id
left join public.entities      ent on ent.id = t.entity_id

union all

-- DOCUMENTOS FISCAIS
select
  'documento_fiscal',
  'documentos_fiscais',
  df.id::text,
  (upper(df.tipo::text) || ' ' || coalesce(df.numero, 's/n')
    || coalesce(' — ' || df.razao_social, ''))::text,
  concat_ws(E'\n',
    upper(df.tipo::text) || ' número ' || coalesce(df.numero, 's/n')
      || coalesce(' série ' || df.serie, '')
      || ' · Direção: ' || df.direcao::text
      || ' · Status: ' || df.status::text,
    'Destinatário/emitente: ' || coalesce(df.razao_social, 'não informado')
      || coalesce(' (CNPJ/CPF ' || df.cnpj_cpf || ')', '')
      || coalesce(' · cliente: ' || c.nome, '')
      || coalesce(' · lojista: ' || l.nome, ''),
    'Emissão: ' || public.jarvis_date(df.data_emissao)
      || ' · Competência: ' || public.jarvis_date(df.data_competencia)
      || coalesce(' · Natureza: ' || df.natureza_operacao, ''),
    'Valor total: ' || public.jarvis_money(df.valor_total)
      || ' · Produtos: ' || public.jarvis_money(df.valor_produtos)
      || ' · Serviços: ' || public.jarvis_money(df.valor_servicos)
      || ' · Frete: ' || public.jarvis_money(df.valor_frete)
      || ' · Desconto: ' || public.jarvis_money(df.valor_desconto),
    'Impostos: ICMS ' || public.jarvis_money(df.valor_icms)
      || ' · IPI ' || public.jarvis_money(df.valor_ipi)
      || ' · PIS ' || public.jarvis_money(df.valor_pis)
      || ' · COFINS ' || public.jarvis_money(df.valor_cofins)
      || ' · ISS ' || public.jarvis_money(df.valor_iss),
    case when p.numero_pedido is not null then 'Vinculada ao pedido #' || p.numero_pedido end,
    case when df.motivo_cancelamento is not null then 'Cancelamento: ' || df.motivo_cancelamento end,
    case when nullif(df.informacoes_adicionais, '') is not null
      then 'Informações adicionais: ' || df.informacoes_adicionais end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'documento_id', df.id,
    'tipo', df.tipo::text,
    'numero', df.numero,
    'status', df.status::text,
    'valor_total', df.valor_total,
    'data_emissao', df.data_emissao,
    'href', '/contabilidade'
  ))
from public.documentos_fiscais df
left join public.clientes c on c.id = df.cliente_id
left join public.lojistas l on l.id = df.lojista_id
left join public.pedidos  p on p.id = df.pedido_id

union all

-- BOLETOS
select
  'boleto',
  'boletos',
  b.id::text,
  ('Boleto ' || coalesce(b.beneficiario, 'sem beneficiário')
    || ' — ' || public.jarvis_money(b.amount))::text,
  concat_ws(E'\n',
    'Boleto de ' || coalesce(b.beneficiario, 'beneficiário não informado')
      || ' · Valor: ' || public.jarvis_money(b.amount)
      || ' · Vencimento: ' || public.jarvis_date(b.due_date)
      || ' · Status: ' || coalesce(b.status::text, 'não informado'),
    case when nullif(b.description, '') is not null then 'Descrição: ' || b.description end,
    nullif(concat_ws(' · ',
      nullif('Tipo de nota: ' || coalesce(b.tipo_nota::text, ''), 'Tipo de nota: '),
      nullif('Entidade: ' || coalesce(ent.name, ''), 'Entidade: ')), ''),
    case when b.paid_at is not null then 'Pago em ' || public.jarvis_date(b.paid_at)
         when b.due_date < current_date then 'Vencido há ' || (current_date - b.due_date::date) || ' dias'
         else 'A vencer em ' || (b.due_date::date - current_date) || ' dias' end,
    case when nullif(b.notes, '') is not null then 'Notas: ' || b.notes end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'boleto_id', b.id,
    'beneficiario', b.beneficiario,
    'amount', b.amount,
    'due_date', b.due_date,
    'status', b.status::text,
    'href', '/financeiro'
  ))
from public.boletos b
left join public.entities ent on ent.id = b.entity_id

union all

-- BARRIS: onde está cada barril e com quem
select
  'barril',
  'barris',
  br.id::text,
  ('Barril ' || br.codigo)::text,
  concat_ws(E'\n',
    'Barril ' || br.codigo || ' · Capacidade: ' || br.capacidade || ' litros',
    'Localização: ' || br.localizacao::text || ' · Conteúdo: ' || br.status_conteudo::text,
    nullif(concat_ws(' · ',
      nullif('Com o cliente: ' || coalesce(c.nome, ''), 'Com o cliente: '),
      nullif('Com o lojista: ' || coalesce(l.nome, ''), 'Com o lojista: ')), ''),
    'Última movimentação: ' || public.jarvis_date(br.data_ultima_movimentacao),
    case when nullif(br.observacoes, '') is not null then 'Observações: ' || br.observacoes end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'barril_id', br.id,
    'codigo', br.codigo,
    'localizacao', br.localizacao::text,
    'status_conteudo', br.status_conteudo::text,
    'cliente_nome', c.nome,
    'href', '/barris'
  ))
from public.barris br
left join public.clientes c on c.id = br.cliente_id
left join public.lojistas l on l.id = br.lojista_id

union all

-- LEADS DO CRM
select
  'lead',
  'leads',
  ld.id::text,
  ('Lead: ' || ld.nome)::text,
  concat_ws(E'\n',
    'Lead: ' || ld.nome || ' · Status no funil: ' || coalesce(ld.status, 'não informado')
      || ' · Origem: ' || coalesce(ld.origem, 'não informada'),
    'Contato: ' || coalesce(ld.telefone, 'sem telefone') || coalesce(' · ' || ld.email, ''),
    'Valor estimado: ' || public.jarvis_money(ld.valor_estimado)
      || coalesce(' · Responsável: ' || ld.responsavel, ''),
    'Criado em ' || public.jarvis_date(coalesce(ld.data_criacao, ld.created_at))
      || ' · Última atualização: ' || public.jarvis_date(ld.ultima_atualizacao),
    case when nullif(ld.observacoes, '') is not null then 'Observações: ' || ld.observacoes end
  ),
  jsonb_strip_nulls(jsonb_build_object(
    'lead_id', ld.id,
    'nome', ld.nome,
    'status', ld.status,
    'valor_estimado', ld.valor_estimado,
    'href', '/crm'
  ))
from public.leads ld

union all

-- RESUMOS MENSAIS: documentos sintéticos para perguntas de período.
-- Busca vetorial não soma; estes cards trazem o total já calculado.
select
  'resumo_mensal',
  'resumo_mensal',
  to_char(m.mes, 'YYYY-MM'),
  ('Resumo de ' || to_char(m.mes, 'MM/YYYY'))::text,
  concat_ws(E'\n',
    'Resumo operacional de ' || to_char(m.mes, 'MM/YYYY')
      || ' (mês ' || to_char(m.mes, 'MM') || ' de ' || to_char(m.mes, 'YYYY')
      || ', trimestre Q' || to_char(m.mes, 'Q') || ')',
    'Pedidos: ' || coalesce(m.total_pedidos, 0)
      || ' · Clientes distintos: ' || coalesce(m.clientes, 0)
      || ' · Faturamento: ' || public.jarvis_money(m.faturamento)
      || ' · Ticket médio: ' || public.jarvis_money(
           case when coalesce(m.total_pedidos, 0) > 0 then m.faturamento / m.total_pedidos end),
    'Litros vendidos: ' || round(coalesce(m.litros, 0)) || ' L',
    'Pedidos por status: ' || coalesce(m.por_status, 'sem pedidos no mês'),
    'Financeiro do mês (por vencimento): a receber ' || public.jarvis_money(coalesce(m.receitas, 0))
      || ' · a pagar ' || public.jarvis_money(coalesce(m.despesas, 0))
      || ' · saldo ' || public.jarvis_money(coalesce(m.receitas, 0) - coalesce(m.despesas, 0)),
    'Lançamentos em aberto no mês: ' || coalesce(m.em_aberto, 0)
  ),
  jsonb_build_object(
    'mes', to_char(m.mes, 'YYYY-MM'),
    'trimestre', to_char(m.mes, 'YYYY') || '-Q' || to_char(m.mes, 'Q'),
    'faturamento', m.faturamento,
    'total_pedidos', m.total_pedidos,
    'litros', m.litros,
    'href', '/dashboard'
  )
from (
  select
    coalesce(ped.mes, fin.mes) as mes,
    ped.total_pedidos, ped.clientes, ped.faturamento, ped.litros, ped.por_status,
    fin.receitas, fin.despesas, fin.em_aberto
  from (
    select
      date_trunc('month', p.data_pedido)::date as mes,
      count(*) as total_pedidos,
      count(distinct p.cliente_id) as clientes,
      sum(coalesce(p.valor_total, 0)) as faturamento,
      sum(coalesce(itens.litros, 0)) as litros,
      string_agg(distinct coalesce(p.status, 'sem status'), ', ') as por_status
    from public.pedidos p
    left join lateral (
      select sum(pi.quantidade * coalesce(pr.capacidade_barril, 0)) as litros
      from public.pedido_itens pi
      left join public.produtos pr on pr.id = pi.produto_id
      where pi.pedido_id = p.id
    ) itens on true
    where p.data_pedido is not null
    group by 1
  ) ped
  full outer join (
    select
      date_trunc('month', t.due_date)::date as mes,
      sum(t.amount) filter (where t.tipo = 'RECEBER') as receitas,
      sum(t.amount) filter (where t.tipo = 'PAGAR')   as despesas,
      count(*) filter (where t.status not in ('PAGO', 'CANCELADO')) as em_aberto
    from public.transactions t
    where t.due_date is not null
    group by 1
  ) fin on fin.mes = ped.mes
) m;

comment on view public.jarvis_document_source is
  'Texto denormalizado por entidade — fonte de verdade dos documentos do Jarvis.';

-- -----------------------------------------------------------------------------
-- Refresh: sincroniza jarvis_documents com a view.
-- Só zera o embedding do que realmente mudou (comparação por hash).
-- -----------------------------------------------------------------------------
create or replace function public.jarvis_refresh_documents(p_kinds text[] default null)
returns table (inseridos int, atualizados int, removidos int, inalterados int)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inserted int := 0;
  v_updated  int := 0;
  v_deleted  int := 0;
  v_total    int := 0;
begin
  with fonte as (
    select
      s.kind, s.source_table, s.source_id, s.title, s.content, s.metadata,
      md5(s.title || s.content || s.metadata::text) as content_hash
    from public.jarvis_document_source s
    where p_kinds is null or s.kind = any(p_kinds)
  ),
  upsert as (
    insert into public.jarvis_documents
      (kind, source_table, source_id, title, content, metadata, content_hash, updated_at)
    select kind, source_table, source_id, title, content, metadata, content_hash, now()
    from fonte
    on conflict (source_table, source_id) do update
      set kind        = excluded.kind,
          title       = excluded.title,
          content     = excluded.content,
          metadata    = excluded.metadata,
          content_hash= excluded.content_hash,
          updated_at  = now(),
          -- conteúdo mudou ⇒ embedding vigente não vale mais
          embedding   = case when public.jarvis_documents.content_hash is distinct from excluded.content_hash
                          then null else public.jarvis_documents.embedding end,
          embedded_at = case when public.jarvis_documents.content_hash is distinct from excluded.content_hash
                          then null else public.jarvis_documents.embedded_at end
      where public.jarvis_documents.content_hash is distinct from excluded.content_hash
    returning (xmax = 0) as is_insert
  )
  select
    count(*) filter (where is_insert),
    count(*) filter (where not is_insert)
  into v_inserted, v_updated
  from upsert;

  -- Entidades apagadas na origem saem da base vetorial
  with fonte as (
    select s.source_table, s.source_id
    from public.jarvis_document_source s
    where p_kinds is null or s.kind = any(p_kinds)
  ),
  orfaos as (
    delete from public.jarvis_documents d
    where (p_kinds is null or d.kind = any(p_kinds))
      and not exists (
        select 1 from fonte f
        where f.source_table = d.source_table and f.source_id = d.source_id
      )
    returning 1
  )
  select count(*) into v_deleted from orfaos;

  select count(*) into v_total
  from public.jarvis_documents d
  where p_kinds is null or d.kind = any(p_kinds);

  return query select v_inserted, v_updated, v_deleted,
                      greatest(v_total - v_inserted - v_updated, 0);
end;
$$;

comment on function public.jarvis_refresh_documents is
  'Regera os documentos do Jarvis a partir dos dados vivos. Idempotente: só invalida o embedding do que mudou.';

-- -----------------------------------------------------------------------------
-- Busca híbrida: vetorial + full-text, combinadas por Reciprocal Rank Fusion.
-- Semântica sozinha erra nome próprio e código; full-text sozinha erra sinônimo.
-- -----------------------------------------------------------------------------
create or replace function public.jarvis_match_documents(
  query_embedding text,
  query_text      text default null,
  match_count     int default 8,
  filter_kinds    text[] default null,
  full_text_weight  float default 1.0,
  semantic_weight   float default 1.0,
  rrf_k           int default 50
)
returns table (
  id uuid,
  kind text,
  title text,
  content text,
  metadata jsonb,
  similarity float,
  score float
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with consulta_vetor as (
    select nullif(query_embedding, '')::extensions.vector(1536) as v
  ),
  consulta_texto as (
    -- websearch_to_tsquery exige TODOS os termos (AND), o que zera o full-text
    -- numa pergunta em linguagem natural. Os lexemas já normalizados viram um
    -- OR, e o ts_rank_cd premia quem casa mais termos.
    select to_tsquery('simple', string_agg(quote_literal(lexeme), ' | ')) as q
    from unnest(to_tsvector('portuguese', coalesce(query_text, '')))
  ),
  semantica as (
    select d.id,
           row_number() over (order by d.embedding <=> qv.v) as rank,
           1 - (d.embedding <=> qv.v) as similarity
    from public.jarvis_documents d
    cross join consulta_vetor qv
    where d.embedding is not null
      and qv.v is not null
      and (filter_kinds is null or d.kind = any(filter_kinds))
    order by d.embedding <=> qv.v
    limit least(match_count * 4, 200)
  ),
  textual as (
    select d.id,
           row_number() over (order by ts_rank_cd(d.fts, c.q) desc) as rank
    from public.jarvis_documents d
    cross join consulta_texto c
    where c.q is not null
      and d.fts @@ c.q
      and (filter_kinds is null or d.kind = any(filter_kinds))
    order by ts_rank_cd(d.fts, c.q) desc
    limit least(match_count * 4, 200)
  )
  select
    d.id, d.kind, d.title, d.content, d.metadata,
    -- cosseno com vetor nulo devolve NaN, e no Postgres NaN ordena acima de tudo
    -- (não segue IEEE: NaN = NaN é verdadeiro), o que envenenaria o ranking.
    case when s.similarity is null or s.similarity = 'NaN'::float8 then 0
         else s.similarity end::float as similarity,
    (coalesce(1.0 / (rrf_k + s.rank), 0) * semantic_weight
      + coalesce(1.0 / (rrf_k + t.rank), 0) * full_text_weight)::float as score
  from semantica s
  full outer join textual t on t.id = s.id
  join public.jarvis_documents d on d.id = coalesce(s.id, t.id)
  order by score desc
  limit match_count;
$$;

comment on function public.jarvis_match_documents is
  'Busca híbrida (vetorial + full-text em português) sobre a base do Jarvis, fundida por RRF.';

-- -----------------------------------------------------------------------------
-- Gravação dos embeddings em lote.
-- A edge function manda [{id, embedding}] como JSON e o cast para vector
-- acontece aqui — text não converte para vector implicitamente.
-- -----------------------------------------------------------------------------
create or replace function public.jarvis_store_embeddings(p_items jsonb)
returns int
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count int;
begin
  update public.jarvis_documents d
     set embedding   = (item->>'embedding')::extensions.vector(1536),
         embedded_at = now()
    from jsonb_array_elements(p_items) as item
   where d.id = (item->>'id')::uuid;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.jarvis_store_embeddings is
  'Grava embeddings em lote a partir de [{id, embedding}].';

-- -----------------------------------------------------------------------------
-- Estado da base — alimenta o painel do Jarvis e o monitoramento do backfill.
-- -----------------------------------------------------------------------------
create or replace view public.jarvis_index_status as
select
  kind,
  count(*)                                    as documentos,
  count(*) filter (where embedding is not null) as embedados,
  count(*) filter (where embedding is null)     as pendentes,
  max(updated_at)                              as ultima_atualizacao,
  max(embedded_at)                             as ultimo_embedding
from public.jarvis_documents
group by kind;

grant select on public.jarvis_index_status to authenticated;
grant select on public.jarvis_document_source to service_role;
grant execute on function public.jarvis_match_documents to authenticated, service_role;
grant execute on function public.jarvis_refresh_documents to service_role;
grant execute on function public.jarvis_store_embeddings to service_role;
