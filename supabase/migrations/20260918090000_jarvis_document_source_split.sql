-- =============================================================================
-- Jarvis — quebra do gerador de documentos em uma view por tipo.
--
-- A view única funcionava, mas qualquer ajuste de texto exigia reescrever as
-- 500 linhas inteiras. Com uma view por tipo, mexer no card do cliente não
-- toca no do pedido. jarvis_document_source vira só a costura.
-- =============================================================================

-- Nome do mês em português: to_char depende do lc_time do servidor, e a base
-- precisa casar com a pergunta ("faturamento de agosto"), não com "08/2026".
create or replace function public.jarvis_mes_extenso(d date)
returns text
language sql
immutable
set search_path = public
as $$
  select case extract(month from d)::int
    when 1 then 'janeiro'   when 2 then 'fevereiro' when 3 then 'março'
    when 4 then 'abril'     when 5 then 'maio'      when 6 then 'junho'
    when 7 then 'julho'     when 8 then 'agosto'    when 9 then 'setembro'
    when 10 then 'outubro'  when 11 then 'novembro' when 12 then 'dezembro'
  end;
$$;

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_cliente as
select t.* from (
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
      case when pc.ultimo_pedido::date > current_date then 'Pedido mais recente ' else 'Último pedido em ' end
        || public.jarvis_date(pc.ultimo_pedido)
        || public.jarvis_quando(pc.ultimo_pedido)
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
      then greatest(current_date - pc.ultimo_pedido::date, 0) end,
    'href', '/clientes/' || c.id
  )) as metadata
from public.clientes c
left join pedidos_por_cliente pc  on pc.cliente_id = c.id
left join produtos_por_cliente prc on prc.cliente_id = c.id
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_pedido as
select t.* from (
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_produto as
select t.* from (
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_lojista as
select t.* from (
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
        || ' · mais recente em ' || public.jarvis_date(ped.ultimo) || public.jarvis_quando(ped.ultimo)
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_transacao as
select t.* from (
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_documento_fiscal as
select t.* from (
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_boleto as
select t.* from (
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_barril as
select t.* from (
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
    'Última movimentação: ' || public.jarvis_date(br.data_ultima_movimentacao)
      || public.jarvis_quando(br.data_ultima_movimentacao),
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_lead as
select t.* from (
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
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
create or replace view public.jarvis_doc_resumo_mensal as
select t.* from (
-- RESUMOS MENSAIS: documentos sintéticos para perguntas de período.
-- Busca vetorial não soma; estes cards trazem o total já calculado.
select
  'resumo_mensal',
  'resumo_mensal',
  to_char(m.mes, 'YYYY-MM'),
  ('Resumo de ' || to_char(m.mes, 'MM/YYYY'))::text,
  concat_ws(E'\n',
    'Resumo operacional de ' || public.jarvis_mes_extenso(m.mes) || ' de ' || to_char(m.mes, 'YYYY')
      || ' (' || to_char(m.mes, 'MM/YYYY') || ', ' || to_char(m.mes, 'Q') || 'º trimestre de '
      || to_char(m.mes, 'YYYY') || ')',
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
    'mes_extenso', public.jarvis_mes_extenso(m.mes),
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
) m
) as t (kind, source_table, source_id, title, content, metadata);

-- -----------------------------------------------------------------------------
-- Costura: a fonte única que o refresh consome.
create or replace view public.jarvis_document_source as
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_cliente
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_pedido
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_produto
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_lojista
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_transacao
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_documento_fiscal
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_boleto
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_barril
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_lead
union all
select kind, source_table, source_id, title, content, metadata from public.jarvis_doc_resumo_mensal;

comment on view public.jarvis_document_source is
  'União das views jarvis_doc_* — fonte de verdade dos documentos do Jarvis.';

grant select on public.jarvis_document_source to service_role;
