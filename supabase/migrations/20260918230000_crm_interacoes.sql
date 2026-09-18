-- =============================================================================
-- Histórico de interações do card
--
-- O chat mostra as mensagens; esta tabela guarda o que *aconteceu* com o
-- contato: mudou de etapa, abriu pedido, alguém anotou algo. É a memória que
-- sobrevive à conversa.
-- =============================================================================

create table if not exists public.crm_interacoes (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.crm_cards(id) on delete cascade,
  tipo text not null check (tipo in ('nota', 'etapa', 'pedido', 'conversa', 'sistema')),
  descricao text not null,
  autor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.crm_interacoes is
  'Linha do tempo por card: notas, mudanças de etapa, pedidos e marcos da conversa.';

create index if not exists crm_interacoes_card_idx
  on public.crm_interacoes (card_id, created_at desc);

alter table public.crm_interacoes enable row level security;

drop policy if exists "Autenticados gerenciam interações" on public.crm_interacoes;
create policy "Autenticados gerenciam interações"
  on public.crm_interacoes for all
  to authenticated
  using (true) with check (true);

-- -----------------------------------------------------------------------------
-- Toda mudança de etapa vira registro, sem ninguém precisar anotar.
-- -----------------------------------------------------------------------------
create or replace function public.crm_registrar_mudanca_etapa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rotulos constant jsonb := '{
    "lead": "Lead", "contato_feito": "Contato feito", "em_atendimento": "Em atendimento",
    "b2c": "B2C", "b2b": "B2B", "pedido_aberto": "Pedido aberto", "follow_up": "Follow up geral"
  }'::jsonb;
begin
  if new.etapa is distinct from old.etapa then
    insert into public.crm_interacoes (card_id, tipo, descricao, autor, metadata)
    values (
      new.id,
      case when new.etapa = 'pedido_aberto' or old.etapa = 'pedido_aberto' then 'pedido' else 'etapa' end,
      coalesce(v_rotulos->>old.etapa, old.etapa) || ' → ' || coalesce(v_rotulos->>new.etapa, new.etapa),
      case when new.movido_por = 'manual' then 'Equipe' else 'Automático' end,
      jsonb_build_object('de', old.etapa, 'para', new.etapa, 'pipeline', new.pipeline)
    );
  end if;
  return new;
exception when others then
  raise warning 'crm_registrar_mudanca_etapa falhou para card %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists crm_log_etapa on public.crm_cards;
create trigger crm_log_etapa
  after update of etapa on public.crm_cards
  for each row execute function public.crm_registrar_mudanca_etapa();

-- -----------------------------------------------------------------------------
-- O WhatsApp manda o nome do contato no metadata. Usar isso em vez de deixar
-- o card chamado "5512988887777" muda completamente a leitura do quadro.
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
  v_push text := nullif(trim(coalesce(new.metadata->>'push_name', new.metadata->>'sender_name', '')), '');
  v_primeira boolean;
begin
  -- Grupos não viram card
  if new.remote_jid like '%@g.us' then
    return new;
  end if;

  v_card := public.crm_upsert_contato(v_fone, v_push, new.remote_jid, 'WhatsApp');
  if v_card is null then
    return new;
  end if;

  select ultima_mensagem_em is null into v_primeira from public.crm_cards where id = v_card;

  update public.crm_cards
     set ultima_mensagem    = left(coalesce(new.content, '[mídia]'), 160),
         ultima_mensagem_em = coalesce(new.created_at, now()),
         aguardando_resposta = (new.direction = 'inbound'),
         -- Nome do WhatsApp é melhor que o número, mas nunca sobrescreve um
         -- nome vindo do cadastro de cliente ou lojista.
         nome = case
                  when v_push is not null and (nome = telefone or nome = '' or nome is null)
                       and cliente_id is null and lojista_id is null
                    then v_push
                  else nome
                end,
         -- Respondemos um lead frio: ele deixa de ser só um contato recebido
         etapa = case
                   when pipeline = 'comercial' and etapa = 'lead' and new.direction = 'outbound'
                     then 'contato_feito'
                   else etapa
                 end,
         updated_at = now()
   where id = v_card;

  if v_primeira then
    insert into public.crm_interacoes (card_id, tipo, descricao, autor, metadata)
    values (v_card, 'conversa',
            case when new.direction = 'inbound' then 'Conversa iniciada pelo contato'
                 else 'Conversa iniciada por nós' end,
            'WhatsApp', jsonb_build_object('remote_jid', new.remote_jid));
  end if;

  return new;
exception when others then
  -- O CRM é consequência, não pré-requisito: uma falha aqui não pode impedir
  -- o registro da mensagem.
  raise warning 'crm_ao_receber_mensagem falhou para %: %', new.remote_jid, sqlerrm;
  return new;
end;
$$;

grant select, insert, update, delete on public.crm_interacoes to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.crm_interacoes;
exception when duplicate_object then
  null;
end $$;
