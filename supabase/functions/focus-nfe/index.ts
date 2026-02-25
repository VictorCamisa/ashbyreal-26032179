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

      // Ref ÚNICA por tentativa para evitar cache do Focus NFe
      const ts = Date.now().toString(36);
      const ref = `nfe-${documento_id.substring(0, 8)}-${ts}`;
      const itens = (doc.documento_fiscal_itens || []).map((item: any, idx: number) => {
        const qty = Number(item.quantidade || 1);
        const rawUnit = Number(item.valor_unitario || 0);
        // SEFAZ valida: valor_bruto == TRUNCAR(quantidade * valor_unitario_comercial, 2)
        // Usar unitário com 2 casas decimais para garantir multiplicação exata
        const unitPrice = Math.round(rawUnit * 100) / 100; // 2 decimal places
        const valorBruto = Math.round(qty * unitPrice * 100) / 100; // exact 2 decimal places
        return {
          numero_item: String(idx + 1),
          codigo_produto: item.codigo || String(idx + 1),
          descricao: item.descricao,
          quantidade_comercial: qty,
          quantidade_tributavel: qty,
          unidade_comercial: item.unidade || 'UN',
          valor_unitario_comercial: unitPrice,
          valor_unitario_tributavel: unitPrice,
          unidade_tributavel: item.unidade || 'UN',
          codigo_ncm: item.ncm || '22030000',
          cfop: item.cfop || '5102',
          valor_bruto: valorBruto,
          icms_origem: '0',
          icms_situacao_tributaria: '102',
          pis_situacao_tributaria: '07',
          cofins_situacao_tributaria: '07',
        };
      });
      console.log('NF-e itens payload:', JSON.stringify(itens));

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
        focus_ref: ref,
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

      // Incrementar número da NFC-e
      let proximoNumero = (config?.ultimo_numero_nfce || 0) + 1;
      await supabase.from('contabilidade_config').update({ ultimo_numero_nfce: proximoNumero }).eq('id', config.id);

      const ts2 = Date.now().toString(36);
      let ref = `nfce-${documento_id.substring(0, 8)}-${ts2}`;
      const itens = (doc.documento_fiscal_itens || []).map((item: any, idx: number) => {
        const qty = Number(item.quantidade || 1);
        const rawUnit = Number(item.valor_unitario || 0);
        const unitPrice = Math.round(rawUnit * 100) / 100;
        const valorBruto = Math.round(qty * unitPrice * 100) / 100;
        return {
          numero_item: String(idx + 1),
          codigo_produto: item.codigo || String(idx + 1),
          descricao: item.descricao,
          quantidade_comercial: qty,
          quantidade_tributavel: qty,
          unidade_comercial: item.unidade || 'UN',
          valor_unitario_comercial: unitPrice,
          valor_unitario_tributavel: unitPrice,
          unidade_tributavel: item.unidade || 'UN',
          codigo_ncm: item.ncm || '22030000',
          cfop: item.cfop || '5102',
          valor_bruto: valorBruto,
          icms_origem: '0',
          icms_situacao_tributaria: '102',
          pis_situacao_tributaria: '07',
          cofins_situacao_tributaria: '07',
        };
      });

      const nfcePayload: any = {
        natureza_operacao: doc.natureza_operacao || 'Venda de mercadoria',
        data_emissao: new Date().toISOString(),
        tipo_documento: '1',
        finalidade_emissao: '1',
        consumidor_final: '1',
        presenca_comprador: '1',
        modalidade_frete: '9',
        numero: String(proximoNumero),
        serie: config?.serie_nfce || '1',
        items: itens,
        formas_pagamento: [{
          forma_pagamento: '01', // Dinheiro
          valor_pagamento: doc.valor_total,
        }],
      };

      if (config?.cnpj) {
        nfcePayload.cnpj_emitente = config.cnpj.replace(/\D/g, '');
      }

      // NFC-e não envia CSC no payload - é configurado na empresa no painel Focus NFe

      // NFC-e é síncrona na Focus NFe - com retry para duplicidade
      let focusData: any = null;
      let currentNumero = proximoNumero;
      const MAX_RETRIES = 10;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const attemptRef = attempt === 0 ? ref : `nfce-${documento_id.substring(0, 8)}-${Date.now().toString(36)}`;
        nfcePayload.numero = String(currentNumero);

        const focusRes = await fetch(`${baseUrl}/v2/nfce?ref=${attemptRef}`, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nfcePayload),
        });

        focusData = await focusRes.json();
        console.log(`Focus NFe NFC-e attempt ${attempt + 1}:`, JSON.stringify(focusData));

        // If duplicate rejection, increment number and retry
        if (focusData.status === 'erro_autorizacao' && focusData.mensagem_sefaz?.includes('Duplicidade')) {
          currentNumero++;
          await supabase.from('contabilidade_config').update({ ultimo_numero_nfce: currentNumero }).eq('id', config.id);
          ref = attemptRef;
          continue;
        }

        ref = attemptRef;
        break;
      }

      // Save final number used
      await supabase.from('contabilidade_config').update({ ultimo_numero_nfce: currentNumero }).eq('id', config.id);

      const updateData: any = {
        status: focusData.status === 'autorizado' ? 'EMITIDA' : 'REJEITADA',
        data_emissao: new Date().toISOString(),
        focus_ref: ref,
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
      let tipo = payload.tipo;
      let ref: string | null = null;
      
      // Always look up ref from the document in DB (ignore any ref from payload)
      if (documento_id) {
        const { data: doc } = await supabase
          .from('documentos_fiscais')
          .select('focus_ref, tipo')
          .eq('id', documento_id)
          .single();
        if (doc?.focus_ref) ref = doc.focus_ref;
        if (doc?.tipo) tipo = doc.tipo;
      }
      
      if (!ref) throw new Error('Este documento ainda não foi enviado ao Focus NFe. Emita primeiro.');
      
      const endpoint = tipo === 'NFCE' ? 'nfce' : 'nfe';

      const focusRes = await fetch(`${baseUrl}/v2/${endpoint}/${ref}`, {
        headers: { 'Authorization': authHeader },
      });

      const focusData = await focusRes.json();
      console.log('Focus NFe consulta response:', JSON.stringify(focusData));

      if (documento_id) {
        const updateData: any = {};

        // Map Focus NFe status to our status
        if (focusData.status === 'autorizado') {
          updateData.status = 'EMITIDA';
        } else if (['erro_autorizacao', 'rejeitado', 'cancelado'].includes(focusData.status)) {
          updateData.status = focusData.status === 'cancelado' ? 'CANCELADA' : 'REJEITADA';
        }

        if (focusData.chave_nfe) updateData.chave_acesso = focusData.chave_nfe;
        if (focusData.numero) updateData.numero = String(focusData.numero);
        if (focusData.caminho_danfe) updateData.pdf_url = focusData.caminho_danfe;
        if (focusData.caminho_xml_nota_fiscal) updateData.xml_content = focusData.caminho_xml_nota_fiscal;

        if (Object.keys(updateData).length > 0) {
          await supabase.from('documentos_fiscais').update(updateData).eq('id', documento_id);
        }
      }

      // Build user-friendly message
      const focusStatus = focusData.status || focusData.codigo || 'desconhecido';
      const statusMessages: Record<string, string> = {
        autorizado: 'NF autorizada pela SEFAZ!',
        processando_autorizacao: 'NF ainda está sendo processada pela SEFAZ. Tente novamente em alguns segundos.',
        erro_autorizacao: `NF rejeitada pela SEFAZ: ${focusData.mensagem_sefaz || focusData.motivo || 'Verifique os dados do documento.'}`,
        cancelado: 'NF cancelada.',
        nao_encontrado: 'NF não encontrada no Focus NFe. Pode ter sido emitida com outra referência.',
      };

      return new Response(JSON.stringify({
        success: focusStatus !== 'nao_encontrado',
        ...focusData,
        status: focusStatus,
        user_message: statusMessages[focusStatus] || `Status: ${focusStatus}`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── CANCELAR NF-e ───
    if (action === 'cancelar') {
      let { justificativa, tipo } = payload;
      let ref: string | null = null;
      
      if (documento_id) {
        const { data: doc } = await supabase
          .from('documentos_fiscais')
          .select('focus_ref, tipo')
          .eq('id', documento_id)
          .single();
        if (doc?.focus_ref) ref = doc.focus_ref;
        if (doc?.tipo) tipo = doc.tipo;
      }
      
      if (!ref) throw new Error('Referência Focus NFe não encontrada.');
      
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

    // CSC deve ser configurado diretamente no painel Focus NFe (painel.focusnfe.com.br)
    // A API /v2/empresas requer token de revenda e não está disponível com token padrão

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
