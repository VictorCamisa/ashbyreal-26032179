-- =============================================================================
-- Fecha o acesso à base do Jarvis.
--
-- O Postgres concede EXECUTE a PUBLIC por padrão, então a anon key (pública no
-- bundle do front) conseguia chamar jarvis_match_documents e ler o conteúdo de
-- toda a operação, além de poder corromper o índice via jarvis_store_embeddings.
--
-- Vale para as edge functions também: verify_jwt no gateway só confere a
-- assinatura do token, e a anon key é um JWT válido. A checagem de papel fica
-- dentro das funções (supabase/functions/_shared/jarvis-auth.ts).
-- =============================================================================

-- Busca: só usuário autenticado e as edge functions.
revoke all on function public.jarvis_match_documents(text, text, int, text[], float, float, int) from public;
revoke all on function public.jarvis_match_documents(text, text, int, text[], float, float, int) from anon;
grant execute on function public.jarvis_match_documents(text, text, int, text[], float, float, int)
  to authenticated, service_role;

-- Manutenção do índice: exclusivo da service_role (edge function / cron).
revoke all on function public.jarvis_refresh_documents(text[]) from public;
revoke all on function public.jarvis_refresh_documents(text[]) from anon, authenticated;
grant execute on function public.jarvis_refresh_documents(text[]) to service_role;

revoke all on function public.jarvis_store_embeddings(jsonb) from public;
revoke all on function public.jarvis_store_embeddings(jsonb) from anon, authenticated;
grant execute on function public.jarvis_store_embeddings(jsonb) to service_role;

-- Helpers de formatação: inofensivos, mas não há razão para expô-los na API.
revoke all on function public.jarvis_money(numeric) from public, anon;
revoke all on function public.jarvis_date(anyelement) from public, anon;
revoke all on function public.jarvis_quando(anyelement) from public, anon;
revoke all on function public.jarvis_mes_extenso(date) from public, anon;

-- Views geradoras: plumbing interno. Rodam com a permissão de quem consulta
-- (security_invoker) e só a service_role enxerga.
do $$
declare v_view text;
begin
  foreach v_view in array array[
    'jarvis_doc_cliente','jarvis_doc_pedido','jarvis_doc_produto','jarvis_doc_lojista',
    'jarvis_doc_transacao','jarvis_doc_documento_fiscal','jarvis_doc_boleto',
    'jarvis_doc_barril','jarvis_doc_lead','jarvis_doc_resumo_mensal','jarvis_document_source'
  ] loop
    execute format('alter view public.%I set (security_invoker = on)', v_view);
    execute format('revoke all on public.%I from anon, authenticated', v_view);
    execute format('grant select on public.%I to service_role', v_view);
  end loop;
end $$;

-- Painel de status: agregado inofensivo, mas passa a respeitar a RLS de quem lê.
alter view public.jarvis_index_status set (security_invoker = on);
revoke all on public.jarvis_index_status from anon;
grant select on public.jarvis_index_status to authenticated, service_role;
