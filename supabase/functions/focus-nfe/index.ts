import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FOCUS_API_PROD = 'https://api.focusnfe.com.br';
const FOCUS_API_HOMOLOG = 'https://homologacao.focusnfe.com.br';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FOCUS_NFE_TOKEN = Deno.env.get('FOCUS_NFE_TOKEN');
    if (!FOCUS_NFE_TOKEN) {
      throw new Error('FOCUS_NFE_TOKEN não configurado');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, documento_id, ambiente, ...payload } = await req.json();
    const baseUrl = ambiente === 'PRODUCAO' ? FOCUS_API_PROD : FOCUS_API_HOMOLOG;
    const authHeader = 'Basic ' + btoa(FOCUS_NFE_TOKEN + ':');

    // ─── EMITIR NF-e ───
    if (action === 'emitir_nfe') {
      const { data: doc, error: docErr } = await supabase
        .from('documentos_fiscais')
        .select('*, cliente:clientes(*), documento_fiscal_itens(*)')
        .eq('id', documento_id)
        .single();

      if (docErr || !doc) throw new Error('Documento não encontrado: ' + docErr?.message);

      // Get config for CNPJ emitente
      const { data: config } = await supabase
        .from('contabilidade_config')
        .select('*')
        .limit(1)
        .single();

      const ref = `nfe-${documento_id.substring(0, 8)}`;
      const itens = (doc.documento_fiscal_itens || []).map((item: any, idx: number) => ({
        numero_item: String(idx + 1),
        codigo_produto: item.codigo || String(idx + 1),
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade_comercial: item.unidade || 'UN',
        valor_unitario_comercial: item.valor_unitario,
        valor_unitario_tributavel: item.valor_unitario,
        unidade_tributavel: item.unidade || 'UN',
        codigo_ncm: item.ncm || '22030000',
        cfop: item.cfop || '5102',
        valor_bruto: item.valor_total,
        icms_origem: '0',
        icms_situacao_tributaria: '102',
        pis_situacao_tributaria: '07',
        cofins_situacao_tributaria: '07',
      }));

      // Build NF-e payload for Focus NFe
      const nfePayload: any = {
        natureza_operacao: doc.natureza_operacao || 'Venda de mercadoria',
        data_emissao: new Date().toISOString(),
        tipo_documento: '1',
        finalidade_emissao: '1',
        consumidor_final: '1',
        presenca_comprador: '1',
        modalidade_frete: '9',
        informacoes_adicionais_contribuinte: doc.informacoes_adicionais || '',
        items: itens,
      };

      // Emitente (from config)
      if (config?.cnpj) {
        nfePayload.cnpj_emitente = config.cnpj.replace(/\D/g, '');
        if (config.inscricao_estadual) {
          nfePayload.inscricao_estadual_emitente = config.inscricao_estadual;
        }
      }

      // Destinatário - NF-e EXIGE CPF/CNPJ do destinatário
      let cpfCnpjDest: string | null = null;
      let nomeDest: string | null = null;

      if (doc.cliente) {
        nomeDest = doc.cliente.nome;
        if (doc.cliente.cpf_cnpj) {
          cpfCnpjDest = doc.cliente.cpf_cnpj.replace(/\D/g, '');
        }
      } else if (doc.razao_social) {
        nomeDest = doc.razao_social;
        if (doc.cnpj_cpf) {
          cpfCnpjDest = doc.cnpj_cpf.replace(/\D/g, '');
        }
      }

      if (!cpfCnpjDest || (cpfCnpjDest.length !== 11 && cpfCnpjDest.length !== 14)) {
        await supabase.from('documentos_fiscais').update({ status: 'REJEITADA' }).eq('id', documento_id);
        throw new Error('NF-e exige CPF ou CNPJ do destinatário. Cadastre o CPF/CNPJ do cliente antes de emitir.');
      }

      nfePayload.nome_destinatario = nomeDest;
      nfePayload.indicador_inscricao_estadual_destinatario = '9';
      if (cpfCnpjDest.length === 11) {
        nfePayload.cpf_destinatario = cpfCnpjDest;
      } else {
        nfePayload.cnpj_destinatario = cpfCnpjDest;
      }

      // Endereço do destinatário
      const endCliente = (doc.cliente?.endereco || doc.endereco) as any;
      if (endCliente && (endCliente.rua || endCliente.logradouro)) {
        nfePayload.logradouro_destinatario = endCliente.rua || endCliente.logradouro || '';
        nfePayload.numero_destinatario = endCliente.numero || 'S/N';
        nfePayload.bairro_destinatario = endCliente.bairro || '';
        nfePayload.municipio_destinatario = endCliente.cidade || '';
        nfePayload.uf_destinatario = endCliente.estado || 'SP';
        nfePayload.cep_destinatario = (endCliente.cep || '').replace(/\D/g, '');
      } else {
        nfePayload.logradouro_destinatario = 'NAO INFORMADO';
        nfePayload.numero_destinatario = 'S/N';
        nfePayload.bairro_destinatario = 'NAO INFORMADO';
        nfePayload.municipio_destinatario = 'Taubate';
        nfePayload.uf_destinatario = 'SP';
        nfePayload.cep_destinatario = '12000000';
      }

      // Valores globais
      if (doc.valor_frete > 0) nfePayload.valor_frete = doc.valor_frete;
      if (doc.valor_desconto > 0) nfePayload.valor_desconto = doc.valor_desconto;

      console.log('Emitindo NF-e para Focus NFe:', JSON.stringify({ ref, baseUrl }));

      // POST to Focus NFe
      const focusRes = await fetch(`${baseUrl}/v2/nfe?ref=${ref}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nfePayload),
      });

      const focusData = await focusRes.json();
      console.log('Focus NFe response:', JSON.stringify(focusData));

      if (!focusRes.ok && focusRes.status !== 200 && focusRes.status !== 202) {
        // Update doc as REJEITADA
        await supabase.from('documentos_fiscais').update({
          status: 'REJEITADA',
        }).eq('id', documento_id);

        throw new Error(`Focus NFe erro [${focusRes.status}]: ${JSON.stringify(focusData)}`);
      }

      // Update documento with Focus NFe reference
      const updateData: any = {
        status: focusData.status === 'autorizado' ? 'EMITIDA' : 'PENDENTE_EMISSAO',
        data_emissao: new Date().toISOString(),
      };

      if (focusData.chave_nfe) updateData.chave_acesso = focusData.chave_nfe;
      if (focusData.numero) updateData.numero = String(focusData.numero);
      if (focusData.serie) updateData.serie = String(focusData.serie);
      if (focusData.caminho_danfe) updateData.pdf_url = focusData.caminho_danfe;
      if (focusData.caminho_xml_nota_fiscal) updateData.xml_content = focusData.caminho_xml_nota_fiscal;

      await supabase.from('documentos_fiscais').update(updateData).eq('id', documento_id);

      return new Response(JSON.stringify({
        success: true,
        status: focusData.status,
        ref,
        chave_nfe: focusData.chave_nfe,
        danfe_url: focusData.caminho_danfe,
        message: focusData.status === 'autorizado' 
          ? 'NF-e emitida com sucesso!' 
          : 'NF-e enviada para processamento. Consulte em alguns segundos.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── EMITIR NFC-e ───
    if (action === 'emitir_nfce') {
      const { data: doc, error: docErr } = await supabase
        .from('documentos_fiscais')
        .select('*, cliente:clientes(*), documento_fiscal_itens(*)')
        .eq('id', documento_id)
        .single();

      if (docErr || !doc) throw new Error('Documento não encontrado');

      const { data: config } = await supabase
        .from('contabilidade_config')
        .select('*')
        .limit(1)
        .single();

      const ref = `nfce-${documento_id.substring(0, 8)}`;
      const itens = (doc.documento_fiscal_itens || []).map((item: any, idx: number) => ({
        numero_item: String(idx + 1),
        codigo_produto: item.codigo || String(idx + 1),
        descricao: item.descricao,
        quantidade: item.quantidade,
        unidade_comercial: item.unidade || 'UN',
        valor_unitario_comercial: item.valor_unitario,
        valor_unitario_tributavel: item.valor_unitario,
        unidade_tributavel: item.unidade || 'UN',
        codigo_ncm: item.ncm || '22030000',
        cfop: item.cfop || '5102',
        valor_bruto: item.valor_total,
        icms_origem: '0',
        icms_situacao_tributaria: '102',
        pis_situacao_tributaria: '07',
        cofins_situacao_tributaria: '07',
      }));

      const nfcePayload: any = {
        natureza_operacao: doc.natureza_operacao || 'Venda de mercadoria',
        data_emissao: new Date().toISOString(),
        tipo_documento: '1',
        finalidade_emissao: '1',
        consumidor_final: '1',
        presenca_comprador: '1',
        modalidade_frete: '9',
        items: itens,
        formas_pagamento: [{
          forma_pagamento: '01', // Dinheiro
          valor_pagamento: doc.valor_total,
        }],
      };

      if (config?.cnpj) {
        nfcePayload.cnpj_emitente = config.cnpj.replace(/\D/g, '');
      }

      // NFC-e é síncrona na Focus NFe
      const focusRes = await fetch(`${baseUrl}/v2/nfce?ref=${ref}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nfcePayload),
      });

      const focusData = await focusRes.json();
      console.log('Focus NFe NFC-e response:', JSON.stringify(focusData));

      const updateData: any = {
        status: focusData.status === 'autorizado' ? 'EMITIDA' : 'REJEITADA',
        data_emissao: new Date().toISOString(),
      };

      if (focusData.chave_nfe) updateData.chave_acesso = focusData.chave_nfe;
      if (focusData.numero) updateData.numero = String(focusData.numero);
      if (focusData.caminho_danfe) updateData.pdf_url = focusData.caminho_danfe;

      await supabase.from('documentos_fiscais').update(updateData).eq('id', documento_id);

      if (focusData.status !== 'autorizado') {
        throw new Error(`NFC-e rejeitada: ${focusData.mensagem_sefaz || JSON.stringify(focusData)}`);
      }

      return new Response(JSON.stringify({
        success: true,
        status: 'autorizado',
        ref,
        chave_nfe: focusData.chave_nfe,
        danfe_url: focusData.caminho_danfe,
        message: 'NFC-e emitida com sucesso!',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── CONSULTAR STATUS ───
    if (action === 'consultar') {
      const { ref, tipo } = payload;
      const endpoint = tipo === 'NFCE' ? 'nfce' : 'nfe';

      const focusRes = await fetch(`${baseUrl}/v2/${endpoint}/${ref}`, {
        headers: { 'Authorization': authHeader },
      });

      const focusData = await focusRes.json();

      // If now authorized, update doc
      if (focusData.status === 'autorizado' && documento_id) {
        const updateData: any = { status: 'EMITIDA' };
        if (focusData.chave_nfe) updateData.chave_acesso = focusData.chave_nfe;
        if (focusData.numero) updateData.numero = String(focusData.numero);
        if (focusData.caminho_danfe) updateData.pdf_url = focusData.caminho_danfe;

        await supabase.from('documentos_fiscais').update(updateData).eq('id', documento_id);
      }

      return new Response(JSON.stringify({
        success: true,
        ...focusData,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── CANCELAR NF-e ───
    if (action === 'cancelar') {
      const { ref, justificativa, tipo } = payload;
      const endpoint = tipo === 'NFCE' ? 'nfce' : 'nfe';

      const focusRes = await fetch(`${baseUrl}/v2/${endpoint}/${ref}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ justificativa }),
      });

      const focusData = await focusRes.json();

      if (focusData.status === 'cancelado' && documento_id) {
        await supabase.from('documentos_fiscais').update({
          status: 'CANCELADA',
          motivo_cancelamento: justificativa,
        }).eq('id', documento_id);
      }

      return new Response(JSON.stringify({
        success: true,
        ...focusData,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Ação desconhecida: ${action}`);

  } catch (error: unknown) {
    console.error('Focus NFe error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
