-- =============================================================================
-- Correção: casar o card pelo telefone CURTO, não só pelo exato.
--
-- A base guarda "12999998888" e o WhatsApp entrega "5512999998888". A busca
-- exata falhava, o código seguia para o insert e batia na chave única de
-- cliente_id — resultado: o card existia mas nunca recebia a conversa.
-- =============================================================================
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

  -- 1. Card já existe com este telefone (exato ou pelos 8 dígitos finais)
  select id into v_card
  from public.crm_cards
  where telefone = v_fone or public.crm_fone_curto(telefone) = v_curto
  order by (telefone = v_fone) desc
  limit 1;

  -- 2. Quem é este número?
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

  -- 3. Sem card pelo telefone, mas a contraparte já tem card (semeado da base)
  if v_card is null and v_lojista is not null then
    select id into v_card from public.crm_cards where lojista_id = v_lojista;
  end if;
  if v_card is null and v_cliente is not null then
    select id into v_card from public.crm_cards where cliente_id = v_cliente;
  end if;

  if v_card is not null then
    -- Completa o que faltava sem sobrescrever o que já é bom
    update public.crm_cards
       set remote_jid = coalesce(remote_jid, p_remote_jid),
           telefone   = coalesce(telefone, v_fone),
           lojista_id = coalesce(lojista_id, v_lojista),
           cliente_id = coalesce(cliente_id, v_cliente),
           tipo_contato = case
             when v_lojista is not null then 'lojista'
             when v_cliente is not null then 'cliente_final'
             else tipo_contato end,
           nome = case when nome = telefone or nome = '' or nome is null
                    then coalesce(v_nome, nullif(p_nome, ''), nome) else nome end,
           updated_at = now()
     where id = v_card;
    return v_card;
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
  returning id into v_card;

  return v_card;
end;
$$;
