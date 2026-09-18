-- =============================================================================
-- CRM em dois pipelines
--
--   Comercial (prospecção):  Lead → Contato feito → Em atendimento
--   Operação (base real):    B2C | B2B | Pedido aberto | Follow up geral
--
-- Um card por contato. Toda conversa de WhatsApp vira card automaticamente; o
-- número é cruzado com lojistas e clientes para decidir em qual pipeline ele
-- nasce. Pedido aberto move o card; entrega/pagamento devolve para a coluna
-- de origem (B2B ou B2C).
-- =============================================================================

create table if not exists public.crm_cards (
  id uuid primary key default gen_random_uuid(),

  -- Identidade do contato
  nome          text not null,
  telefone      text,               -- só dígitos
  remote_jid    text,               -- conversa no WhatsApp

  -- Vínculos com o resto do sistema
  cliente_id       uuid references public.clientes(id) on delete set null,
  lojista_id       uuid references public.lojistas(id) on delete set null,
  lead_id          uuid references public.leads(id) on delete set null,
  pedido_aberto_id uuid references public.pedidos(id) on delete set null,

  -- Classificação (o que a leitura do número/conversa concluiu)
  tipo_contato  text not null default 'desconhecido'
    check (tipo_contato in ('lojista', 'cliente_final', 'desconhecido')),

  -- Posição no quadro
  pipeline text not null check (pipeline in ('comercial', 'operacao')),
  etapa    text not null check (etapa in (
    'lead', 'contato_feito', 'em_atendimento',
    'b2c', 'b2b', 'pedido_aberto', 'follow_up'
  )),

  -- Contexto mostrado no card
  origem             text,
  ultima_mensagem    text,
  ultima_mensagem_em timestamptz,
  aguardando_resposta boolean not null default false,
  valor_estimado     numeric,
  observacoes        text,

  -- Rastro de movimentação: separa o que o sistema fez do que a pessoa fez
  movido_em   timestamptz not null default now(),
  movido_por  text not null default 'automatico' check (movido_por in ('automatico', 'manual')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_cards is
  'Cards do CRM: um por contato, alimentado por WhatsApp, clientes, lojistas e pedidos.';

-- Um contato não pode ter dois cards
create unique index if not exists crm_cards_telefone_uniq on public.crm_cards (telefone) where telefone is not null;
create unique index if not exists crm_cards_cliente_uniq  on public.crm_cards (cliente_id) where cliente_id is not null;
create unique index if not exists crm_cards_lojista_uniq  on public.crm_cards (lojista_id) where lojista_id is not null;
create index if not exists crm_cards_quadro_idx on public.crm_cards (pipeline, etapa);
create index if not exists crm_cards_mensagem_idx on public.crm_cards (ultima_mensagem_em desc nulls last);

alter table public.crm_cards enable row level security;

drop policy if exists "Autenticados gerenciam o CRM" on public.crm_cards;
create policy "Autenticados gerenciam o CRM"
  on public.crm_cards for all
  to authenticated
  using (true) with check (true);

-- -----------------------------------------------------------------------------
-- Telefone comparável: guarda só dígitos e compara pelo final, porque a base
-- mistura DDI, DDD e o 9 extra do celular.
-- -----------------------------------------------------------------------------
create or replace function public.crm_fone(v text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(regexp_replace(coalesce(v, ''), '\D', '', 'g'), '');
$$;

create or replace function public.crm_fone_curto(v text)
returns text
language sql
immutable
set search_path = public
as $$
  select right(public.crm_fone(v), 8);
$$;

-- -----------------------------------------------------------------------------
-- Upsert de card a partir de um contato de WhatsApp.
-- -----------------------------------------------------------------------------
create or replace function public.crm_upsert_contato(
  p_telefone   text,
  p_nome       text default null,
  p_remote_jid text default null,
  p_origem     text default 'WhatsApp'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fone     text := public.crm_fone(p_telefone);
  v_curto    text := public.crm_fone_curto(p_telefone);
  v_card     uuid;
  v_lojista  uuid;
  v_cliente  uuid;
  v_nome     text;
  v_tipo     text;
  v_pipeline text;
  v_etapa    text;
begin
  if v_fone is null then
    return null;
  end if;

  select id into v_card from public.crm_cards where telefone = v_fone;
  if v_card is not null then
    -- Card já existe: só completa o que faltava
    update public.crm_cards
       set remote_jid = coalesce(remote_jid, p_remote_jid),
           nome       = case when nome = telefone or nome = '' then coalesce(p_nome, nome) else nome end,
           updated_at = now()
     where id = v_card;
    return v_card;
  end if;

  select l.id, l.nome into v_lojista, v_nome
  from public.lojistas l
  where public.crm_fone_curto(l.telefone) = v_curto
     or public.crm_fone_curto(l.telefone_secundario) = v_curto
  limit 1;

  if v_lojista is null then
    select c.id, c.nome into v_cliente, v_nome
    from public.clientes c
    where public.crm_fone_curto(c.telefone) = v_curto
    limit 1;
  end if;

  if v_lojista is not null then
    v_tipo := 'lojista';  v_pipeline := 'operacao';  v_etapa := 'b2b';
  elsif v_cliente is not null then
    v_tipo := 'cliente_final'; v_pipeline := 'operacao'; v_etapa := 'b2c';
  else
    -- Número que ninguém conhece: entra na prospecção
    v_tipo := 'desconhecido'; v_pipeline := 'comercial'; v_etapa := 'lead';
  end if;

  insert into public.crm_cards
    (nome, telefone, remote_jid, cliente_id, lojista_id, tipo_contato, pipeline, etapa, origem)
  values
    (coalesce(v_nome, nullif(p_nome, ''), p_telefone), v_fone, p_remote_jid,
     v_cliente, v_lojista, v_tipo, v_pipeline, v_etapa, p_origem)
  on conflict (telefone) where telefone is not null do update
    set updated_at = now()
  returning id into v_card;

  return v_card;
end;
$$;

-- -----------------------------------------------------------------------------
-- Toda mensagem de WhatsApp alimenta o CRM.
-- -----------------------------------------------------------------------------
create or replace function public.crm_ao_receber_mensagem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card uuid;
  v_fone text := split_part(new.remote_jid, '@', 1);
begin
  -- Grupos não viram card
  if new.remote_jid like '%@g.us' then
    return new;
  end if;

  v_card := public.crm_upsert_contato(v_fone, null, new.remote_jid, 'WhatsApp');
  if v_card is null then
    return new;
  end if;

  update public.crm_cards
     set ultima_mensagem    = left(coalesce(new.content, '[mídia]'), 160),
         ultima_mensagem_em = coalesce(new.created_at, now()),
         aguardando_resposta = (new.direction = 'inbound'),
         -- Respondemos um lead frio: ele deixa de ser só um contato recebido
         etapa = case
                   when pipeline = 'comercial' and etapa = 'lead' and new.direction = 'outbound'
                     then 'contato_feito'
                   else etapa
                 end,
         updated_at = now()
   where id = v_card;

  return new;
exception when others then
  -- O CRM é consequência, não pré-requisito: uma falha aqui não pode impedir
  -- o registro da mensagem.
  raise warning 'crm_ao_receber_mensagem falhou para %: %', new.remote_jid, sqlerrm;
  return new;
end;
$$;

drop trigger if exists crm_whatsapp_sync on public.whatsapp_messages;
create trigger crm_whatsapp_sync
  after insert on public.whatsapp_messages
  for each row execute function public.crm_ao_receber_mensagem();

-- -----------------------------------------------------------------------------
-- Pedido aberto puxa o card; entrega/pagamento devolve para a coluna de origem.
-- -----------------------------------------------------------------------------
create or replace function public.crm_etapa_de_repouso(p_tipo text)
returns text
language sql
immutable
set search_path = public
as $$
  select case when p_tipo = 'lojista' then 'b2b' else 'b2c' end;
$$;

create or replace function public.crm_ao_mudar_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_card    uuid;
  v_aberto  boolean := coalesce(new.status, 'pendente') in ('pendente', 'parcial');
  v_tipo    text;
  v_nome    text;
  v_fone    text;
begin
  -- Localiza (ou cria) o card da contraparte do pedido
  if new.lojista_id is not null then
    select id into v_card from public.crm_cards where lojista_id = new.lojista_id;
    if v_card is null then
      select nome, public.crm_fone(telefone) into v_nome, v_fone
      from public.lojistas where id = new.lojista_id;
      insert into public.crm_cards (nome, telefone, lojista_id, tipo_contato, pipeline, etapa, origem)
      values (coalesce(v_nome, 'Lojista'), v_fone, new.lojista_id, 'lojista', 'operacao', 'b2b', 'Pedido')
      on conflict (telefone) where telefone is not null
        do update set lojista_id = excluded.lojista_id, tipo_contato = 'lojista'
      returning id into v_card;
    end if;
    v_tipo := 'lojista';
  elsif new.cliente_id is not null then
    select id into v_card from public.crm_cards where cliente_id = new.cliente_id;
    if v_card is null then
      select nome, public.crm_fone(telefone) into v_nome, v_fone
      from public.clientes where id = new.cliente_id;
      insert into public.crm_cards (nome, telefone, cliente_id, tipo_contato, pipeline, etapa, origem)
      values (coalesce(v_nome, 'Cliente'), v_fone, new.cliente_id, 'cliente_final', 'operacao', 'b2c', 'Pedido')
      on conflict (telefone) where telefone is not null
        do update set cliente_id = excluded.cliente_id
      returning id into v_card;
    end if;
    v_tipo := 'cliente_final';
  else
    return new;
  end if;

  if v_card is null then
    return new;
  end if;

  if v_aberto then
    update public.crm_cards
       set pipeline = 'operacao',
           etapa = 'pedido_aberto',
           pedido_aberto_id = new.id,
           valor_estimado = new.valor_total,
           movido_em = now(),
           movido_por = 'automatico',
           updated_at = now()
     where id = v_card;
  else
    -- Fechou: volta para o repouso, a menos que exista outro pedido em aberto
    update public.crm_cards c
       set pipeline = 'operacao',
           etapa = case
             when exists (
               select 1 from public.pedidos p
               where p.id <> new.id
                 and coalesce(p.status, 'pendente') in ('pendente', 'parcial')
                 and ((new.lojista_id is not null and p.lojista_id = new.lojista_id)
                   or (new.lojista_id is null and p.cliente_id = new.cliente_id))
             ) then 'pedido_aberto'
             else public.crm_etapa_de_repouso(coalesce(c.tipo_contato, v_tipo))
           end,
           pedido_aberto_id = null,
           movido_em = now(),
           movido_por = 'automatico',
           updated_at = now()
     where c.id = v_card;
  end if;

  return new;
exception when others then
  -- Nunca bloquear uma venda por causa do quadro do CRM.
  raise warning 'crm_ao_mudar_pedido falhou para pedido %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists crm_pedido_sync on public.pedidos;
create trigger crm_pedido_sync
  after insert or update of status, cliente_id, lojista_id, valor_total on public.pedidos
  for each row execute function public.crm_ao_mudar_pedido();

-- -----------------------------------------------------------------------------
-- Visão do quadro, já com o que o card precisa mostrar.
-- -----------------------------------------------------------------------------
create or replace view public.crm_quadro as
select
  c.id, c.nome, c.telefone, c.remote_jid,
  c.cliente_id, c.lojista_id, c.pedido_aberto_id,
  c.tipo_contato, c.pipeline, c.etapa, c.origem,
  c.ultima_mensagem, c.ultima_mensagem_em, c.aguardando_resposta,
  c.valor_estimado, c.observacoes, c.movido_em, c.movido_por, c.created_at,
  p.numero_pedido as pedido_numero,
  p.valor_total   as pedido_valor,
  p.data_entrega  as pedido_entrega,
  hist.pedidos       as pedidos_historico,
  hist.faturamento   as faturamento_historico,
  hist.ultimo_pedido as ultimo_pedido_em
from public.crm_cards c
left join public.pedidos p on p.id = c.pedido_aberto_id
left join lateral (
  select count(*) as pedidos,
         sum(coalesce(x.valor_total, 0)) as faturamento,
         max(x.data_pedido) as ultimo_pedido
  from public.pedidos x
  where (c.lojista_id is not null and x.lojista_id = c.lojista_id)
     or (c.cliente_id is not null and x.cliente_id = c.cliente_id)
) hist on true;

alter view public.crm_quadro set (security_invoker = on);
revoke all on public.crm_quadro from anon;
grant select on public.crm_quadro to authenticated, service_role;

revoke all on function public.crm_upsert_contato(text, text, text, text) from public, anon;
grant execute on function public.crm_upsert_contato(text, text, text, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Semeadura: a base que já compra entra no quadro de Operação.
-- Idempotente — rodar de novo não duplica card.
-- -----------------------------------------------------------------------------
insert into public.crm_cards (nome, telefone, lojista_id, tipo_contato, pipeline, etapa, origem)
select l.nome, public.crm_fone(l.telefone), l.id, 'lojista', 'operacao', 'b2b', 'Base'
from public.lojistas l
where exists (select 1 from public.pedidos p where p.lojista_id = l.id)
on conflict do nothing;

insert into public.crm_cards (nome, telefone, cliente_id, tipo_contato, pipeline, etapa, origem)
select c.nome, public.crm_fone(c.telefone), c.id, 'cliente_final', 'operacao', 'b2c', 'Base'
from public.clientes c
where exists (select 1 from public.pedidos p where p.cliente_id = c.id)
on conflict do nothing;

-- Quem tem pedido em aberto já nasce na coluna certa
with abertos as (
  select distinct on (coalesce(p.lojista_id, p.cliente_id))
         p.id, p.valor_total, p.lojista_id, p.cliente_id
  from public.pedidos p
  where coalesce(p.status, 'pendente') in ('pendente', 'parcial')
    and coalesce(p.lojista_id, p.cliente_id) is not null
  order by coalesce(p.lojista_id, p.cliente_id), p.data_pedido desc nulls last
)
update public.crm_cards c
   set etapa = 'pedido_aberto',
       pedido_aberto_id = a.id,
       valor_estimado = a.valor_total
from abertos a
where c.pipeline = 'operacao'
  and c.etapa in ('b2b', 'b2c')
  and ((c.lojista_id is not null and a.lojista_id = c.lojista_id)
    or (c.cliente_id is not null and a.cliente_id = c.cliente_id));

-- -----------------------------------------------------------------------------
-- Realtime: sem publicar a tabela, o quadro só atualiza ao recarregar a página.
-- -----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.crm_cards;
exception when duplicate_object then
  null;
end $$;
