-- =============================================================================
-- Cadastro unificado derivado dos pedidos.
--
-- Problema: a página de Clientes lia só a tabela `clientes`, então os 162
-- pedidos B2B (R$ 294 mil) ligados a `lojistas` simplesmente não apareciam —
-- a maior parte do faturamento ficava invisível na tela de clientes.
--
-- Esta view cruza os pedidos e devolve UMA linha por contraparte real, seja
-- ela cliente ou lojista, com o histórico consolidado e as pendências de
-- cadastro sinalizadas. É só leitura: não cria, não funde e não apaga nada.
-- =============================================================================

-- Termos que denunciam estabelecimento comercial em vez de pessoa física.
create or replace function public.e_estabelecimento(nome text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(nome, '') ~* (
    '\m(bar|boteco|pub|restaurante|pizzaria|lanchonete|lanches|hamburgueria|burger|'
    'choperia|chopperia|choparia|chopeira|chopp|distribuidora|adega|empório|emporio|'
    'mercado|mercearia|minimercado|atacado|depósito|deposito|padaria|confeitaria|doceria|'
    'sorveteria|açaí|acai|café|cafe|espeto|espetinho|petiscaria|churrascaria|açougue|acougue|'
    'sushi|temaki|pastel|salgados|cantina|cantinho|recanto|quiosque|espaço|espaco|point|'
    'buffet|bufê|bufe|eventos|hotel|pousada|clube|associação|associacao|'
    'ltda|eireli|mei|pdv|comércio|comercio|conveniência|conveniencia|food|grill|'
    'self service|casa de)\M'
  );
$$;

revoke all on function public.e_estabelecimento(text) from public, anon;
grant execute on function public.e_estabelecimento(text) to authenticated, service_role;

create or replace view public.clientes_unificados as
with pedidos_por_cliente as (
  select p.cliente_id as ref_id,
         count(*) as pedidos,
         sum(coalesce(p.valor_total, 0)) as faturamento,
         min(p.data_pedido) as primeiro_pedido,
         max(p.data_pedido) as ultimo_pedido,
         count(*) filter (where p.status = 'pendente') as pedidos_pendentes,
         count(distinct nullif(p.endereco_entrega->>'cidade', '')) as cidades_distintas
  from public.pedidos p
  where p.cliente_id is not null
  group by 1
),
pedidos_por_lojista as (
  select p.lojista_id as ref_id,
         count(*) as pedidos,
         sum(coalesce(p.valor_total, 0)) as faturamento,
         min(p.data_pedido) as primeiro_pedido,
         max(p.data_pedido) as ultimo_pedido,
         count(*) filter (where p.status = 'pendente') as pedidos_pendentes,
         count(distinct nullif(p.endereco_entrega->>'cidade', '')) as cidades_distintas
  from public.pedidos p
  where p.lojista_id is not null
  group by 1
),
unificado as (
  -- Contrapartes vindas da tabela de clientes
  select
    c.id,
    'cliente'::text as tipo_cadastro,
    c.nome,
    c.empresa,
    nullif(c.telefone, '') as telefone,
    c.email,
    c.cpf_cnpj as documento,
    nullif(c.endereco->>'cidade', '') as cidade,
    c.status,
    c.origem,
    c.observacoes,
    coalesce(pc.pedidos, 0) as pedidos,
    coalesce(pc.faturamento, 0) as faturamento,
    pc.primeiro_pedido, pc.ultimo_pedido,
    coalesce(pc.pedidos_pendentes, 0) as pedidos_pendentes,
    coalesce(pc.cidades_distintas, 0) as cidades_distintas,
    -- B2B por sinal explícito: documento de empresa, campo empresa ou nome comercial
    (length(regexp_replace(coalesce(c.cpf_cnpj, ''), '\D', '', 'g')) = 14
      or nullif(c.empresa, '') is not null
      or public.e_estabelecimento(c.nome)) as sinal_b2b
  from public.clientes c
  left join pedidos_por_cliente pc on pc.ref_id = c.id

  union all

  -- Contrapartes vindas da tabela de lojistas: B2B por definição
  select
    l.id,
    'lojista',
    l.nome,
    coalesce(l.nome_fantasia, l.razao_social),
    nullif(l.telefone, ''),
    l.email,
    l.cnpj,
    nullif(l.endereco->>'cidade', ''),
    l.status,
    'Lojista',
    l.observacoes,
    coalesce(pl.pedidos, 0),
    coalesce(pl.faturamento, 0),
    pl.primeiro_pedido, pl.ultimo_pedido,
    coalesce(pl.pedidos_pendentes, 0),
    coalesce(pl.cidades_distintas, 0),
    true
  from public.lojistas l
  left join pedidos_por_lojista pl on pl.ref_id = l.id
)
select
  u.id,
  u.tipo_cadastro,
  u.nome,
  u.empresa,
  u.telefone,
  -- e-mails sintéticos da importação não são contato de verdade
  case when u.email like '%@taubatechopp.local' then null else u.email end as email,
  u.documento,
  u.cidade,
  u.status,
  u.origem,
  u.observacoes,
  u.pedidos,
  u.faturamento,
  case when u.pedidos > 0 then u.faturamento / u.pedidos end as ticket_medio,
  u.primeiro_pedido,
  u.ultimo_pedido,
  u.pedidos_pendentes,
  case when u.ultimo_pedido is not null
    then greatest(current_date - u.ultimo_pedido::date, 0) end as dias_sem_comprar,

  case
    when u.tipo_cadastro = 'lojista' or u.sinal_b2b then 'B2B'
    -- nome de pessoa: pelo menos duas palavras, sem termo comercial
    when u.nome ~ '^\s*\S+\s+\S+' and not public.e_estabelecimento(u.nome) then 'B2C'
    else 'indefinido'
  end as segmento,

  -- Pendências de cadastro: sinalizadas, nunca corrigidas automaticamente
  (select array_remove(array[
     case when u.nome is null or u.nome ~* '\m(revisar|nao informado|não informado)\M'
       then 'nome ilegível no canhoto' end,
     case when u.telefone is null
            or length(regexp_replace(u.telefone, '\D', '', 'g')) not between 10 and 13
       then 'telefone inválido' end,
     case when u.email is null or u.email like '%@taubatechopp.local'
       then 'sem e-mail real' end,
     -- vários pedidos em cidades diferentes no mesmo cadastro = clientes misturados
     case when u.cidades_distintas > 1
       then 'cadastro com pedidos de ' || u.cidades_distintas || ' cidades — possivelmente clientes distintos' end
   ], null)) as pendencias,

  -- Só o que compromete a identidade do cadastro conta como revisão:
  -- e-mail e telefone faltando são lacunas, não erros de identificação.
  (u.nome is null
   or u.nome ~* '\m(revisar|nao informado|não informado)\M'
   or u.cidades_distintas > 1) as precisa_revisao
from unificado u
where u.pedidos > 0;

comment on view public.clientes_unificados is
  'Uma linha por contraparte real (cliente ou lojista) que tem pedidos, com histórico consolidado e pendências de cadastro. Somente leitura.';

-- ATENÇÃO: create or replace view descarta as reloptions. Sempre que esta
-- definição for recriada, o security_invoker precisa ser reaplicado — sem ele
-- a view roda como dona e fura a RLS de pedidos, expondo o faturamento por
-- cliente à anon key, que é pública no bundle do front.
alter view public.clientes_unificados set (security_invoker = on);
revoke all on public.clientes_unificados from anon;
grant select on public.clientes_unificados to authenticated, service_role;
