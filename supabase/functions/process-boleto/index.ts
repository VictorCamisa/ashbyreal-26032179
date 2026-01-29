import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, imageBase64, tipoNota } = await req.json();

    // Support both image and imageBase64 parameters
    const imageData = image || imageBase64;
    
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Imagem não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Chave da API OpenAI não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-boleto] Processando boleto com OpenAI GPT-4o, tipo:', tipoNota);

    // PROMPT OTIMIZADO PARA MÁXIMA PRECISÃO
    const systemPrompt = `Você é um sistema de OCR de alta precisão especializado em documentos financeiros brasileiros.
Sua taxa de acerto deve ser 99%+. Analise CADA PIXEL da imagem com extremo cuidado.

## ESTRATÉGIA DE EXTRAÇÃO DE ALTA PRECISÃO:

### 1. VALOR TOTAL (CRÍTICO - use múltiplas validações):
PRIORIDADE DE BUSCA (do mais confiável para menos):
a) LINHA DIGITÁVEL DO BOLETO: Os últimos 10 dígitos antes do dígito verificador contêm o valor
   - Formato: XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXVVVVVVVVVV
   - Os V's são o valor com 2 casas decimais (ex: 0000012345 = R$ 123,45)
b) CÓDIGO DE BARRAS: Decodifique se visível
c) Campo "VALOR DO DOCUMENTO" ou "VALOR TOTAL" no corpo do boleto
d) Campo grande no canto superior direito (típico layout de boleto)

VALIDAÇÃO CRUZADA: Compare o valor encontrado em múltiplos locais. Se divergir, priorize a linha digitável.

### 2. DATA DE VENCIMENTO:
BUSCAR POR (em ordem):
a) Campo rotulado "VENCIMENTO", "DT.VENC", "DATA VENCIMENTO"
b) Em notas fiscais: "VENCIMENTO", "PAGAR ATÉ"
c) Em cupons: Data próxima ao valor total

FORMATOS ACEITOS: DD/MM/AAAA, DD/MM/YY, DD-MM-AAAA
VALIDAÇÃO: A data deve ser coerente (dia 1-31, mês 1-12, ano 2020-2030)

### 3. BENEFICIÁRIO/CEDENTE:
BUSCAR POR:
a) Campo "BENEFICIÁRIO", "CEDENTE", "FAVORECIDO" (NÃO confundir com SACADO/PAGADOR)
b) Logo ou nome da empresa no cabeçalho
c) CNPJ associado ao recebedor

### 4. DESCRIÇÃO/REFERÊNCIA:
a) Campo "INSTRUÇÕES", "DESCRIÇÃO", "REFERÊNCIA"
b) Número da nota fiscal, fatura ou documento
c) Competência/período de referência

## REGRAS DE CONFIANÇA:
- "alta": Campo claramente legível, sem ambiguidade, validado por múltiplas fontes
- "media": Campo legível mas com apenas uma fonte ou pequena incerteza
- "baixa": Campo parcialmente legível, inferido ou com incerteza significativa

## FORMATO DE RESPOSTA (JSON PURO, SEM MARKDOWN):
{
  "valor": 1234.56,
  "vencimento": "DD/MM/AAAA",
  "beneficiario": "Nome do Beneficiário",
  "descricao": "Descrição ou referência do documento",
  "numero_documento": "123456",
  "linha_digitavel": "12345.67890 12345.678901 12345.678901 1 12340000012345",
  "cnpj_beneficiario": "00.000.000/0000-00",
  "confianca": {
    "valor": "alta",
    "vencimento": "alta",
    "beneficiario": "media"
  },
  "metodo_extracao_valor": "linha_digitavel|campo_valor|codigo_barras",
  "observacoes": "Notas sobre qualidade da imagem ou campos parciais"
}

IMPORTANTE: 
- Valores monetários SEMPRE em formato numérico (1234.56, não "1.234,56")
- Se um campo não for encontrado, use null
- NUNCA invente dados - prefira null a informação incorreta`;

    const userPrompt = `Analise esta imagem de documento financeiro brasileiro com MÁXIMA PRECISÃO.
${tipoNota === 'SEM_NOTA' ? 'ATENÇÃO: Este é um documento SEM NOTA FISCAL (conta, fatura, boleto simples).' : ''}
${tipoNota === 'COM_NOTA' ? 'Este documento POSSUI NOTA FISCAL associada - busque também número da NF.' : ''}

INSTRUÇÕES ESPECÍFICAS:
1. Examine TODA a imagem antes de responder
2. Se houver linha digitável, EXTRAIA E USE para validar o valor
3. Verifique se há QR Code PIX (pode conter dados adicionais)
4. Para valores, sempre confirme verificando em múltiplos locais do documento
5. Se a imagem estiver borrada/cortada, indique nas observações

Retorne APENAS o JSON, sem formatação markdown, sem explicações.`;

    // Parse base64 if it's a data URL
    let base64Data = imageData;
    let mediaType = 'image/jpeg';
    
    if (imageData.startsWith('data:')) {
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mediaType = matches[1];
        base64Data = matches[2];
      }
    } else {
      // Detect image type from base64
      if (base64Data.startsWith('/9j/')) {
        mediaType = 'image/jpeg';
      } else if (base64Data.startsWith('iVBOR')) {
        mediaType = 'image/png';
      }
    }

    console.log('[process-boleto] Tipo de mídia:', mediaType);

    const imageUrl = imageData.startsWith('data:') ? imageData : `data:${mediaType};base64,${base64Data}`;

    // Usar configurações otimizadas para OCR
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high' // Máxima qualidade de análise
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0, // Zero temperatura para máxima precisão e consistência
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[process-boleto] Erro OpenAI:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições da OpenAI excedido. Tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erro na API OpenAI: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    console.log('[process-boleto] Resposta recebida, tokens:', aiResponse.usage);

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[process-boleto] Resposta vazia');
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-boleto] Conteúdo bruto:', content.substring(0, 500));

    // Parse JSON response - remove markdown if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }

    let parsedData;
    try {
      parsedData = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('[process-boleto] Erro parse JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar resposta da IA',
          raw: jsonContent.substring(0, 200)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[process-boleto] Dados extraídos:', JSON.stringify(parsedData));

    // Process extracted data com validações aprimoradas
    let amount = 0;
    let valorValidado = false;
    
    // Tentar extrair valor da linha digitável se disponível
    if (parsedData.linha_digitavel && parsedData.metodo_extracao_valor === 'linha_digitavel') {
      const linhaLimpa = parsedData.linha_digitavel.replace(/\D/g, '');
      if (linhaLimpa.length >= 47) {
        // Últimos 10 dígitos antes do final contêm o valor
        const valorStr = linhaLimpa.slice(-10);
        const valorExtraido = parseInt(valorStr, 10) / 100;
        if (valorExtraido > 0 && valorExtraido < 1000000) { // Sanity check
          amount = valorExtraido;
          valorValidado = true;
          console.log('[process-boleto] Valor extraído da linha digitável:', amount);
        }
      }
    }
    
    // Fallback para valor do campo
    if (!valorValidado && parsedData.valor !== null && parsedData.valor !== undefined) {
      if (typeof parsedData.valor === 'string') {
        // Handle Brazilian format: 1.234,56
        amount = parseFloat(parsedData.valor.replace(/\./g, '').replace(',', '.'));
      } else {
        amount = parseFloat(parsedData.valor);
      }
    }

    // Validar data
    let dueDate = null;
    if (parsedData.vencimento) {
      // Parse DD/MM/YYYY or DD/MM/YY format
      const dateMatch = parsedData.vencimento.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        let year = parseInt(dateMatch[3]);
        if (year < 100) {
          year += 2000;
        }
        const month = parseInt(dateMatch[2]) - 1;
        const day = parseInt(dateMatch[1]);
        
        // Validação de data coerente
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2030) {
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            dueDate = date.toISOString().split('T')[0];
          }
        }
      }
    }

    // If no due date and it's SEM_NOTA, calculate from today + 15 days
    if (!dueDate && tipoNota === 'SEM_NOTA') {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      dueDate = futureDate.toISOString().split('T')[0];
      console.log('[process-boleto] Vencimento calculado (hoje + 15 dias):', dueDate);
    }

    // Calcular confiança real baseada em múltiplos fatores
    const calcularConfianca = (campo: string, confiancaIA: string, validado: boolean) => {
      let base = confiancaIA === 'alta' ? 95 : confiancaIA === 'media' ? 80 : 60;
      if (validado) base = Math.min(99, base + 5);
      if (parsedData.observacoes?.toLowerCase().includes('borrad') || 
          parsedData.observacoes?.toLowerCase().includes('cortad')) {
        base = Math.max(50, base - 15);
      }
      return base;
    };

    const confiancaValor = calcularConfianca('valor', parsedData.confianca?.valor, valorValidado);
    const confiancaVencimento = calcularConfianca('vencimento', parsedData.confianca?.vencimento, !!dueDate);
    const confiancaBeneficiario = calcularConfianca('beneficiario', parsedData.confianca?.beneficiario, false);
    
    // Confiança geral ponderada
    const overallConfidence = Math.round(
      (confiancaValor * 0.5) + (confiancaVencimento * 0.3) + (confiancaBeneficiario * 0.2)
    );

    // Build response in original format for compatibility
    const result = {
      success: true,
      extracted: {
        amount: {
          value: isNaN(amount) ? '' : amount.toString().replace('.', ','),
          confidence: confiancaValor,
          source: valorValidado ? 'Linha Digitável (validado)' : 'OpenAI GPT-4o'
        },
        due_date: {
          value: dueDate || '',
          confidence: confiancaVencimento,
          source: 'OpenAI GPT-4o'
        },
        beneficiario: {
          value: parsedData.beneficiario || '',
          confidence: confiancaBeneficiario,
          source: 'OpenAI GPT-4o'
        },
        description: {
          value: parsedData.descricao || parsedData.numero_documento || '',
          confidence: 85,
          source: 'OpenAI GPT-4o'
        },
        numero_movimento: {
          value: parsedData.numero_documento || '',
          confidence: 75,
          source: 'OpenAI GPT-4o'
        },
        linha_digitavel: {
          value: parsedData.linha_digitavel || '',
          confidence: parsedData.linha_digitavel ? 95 : 0,
          source: 'OpenAI GPT-4o'
        },
        cnpj_beneficiario: {
          value: parsedData.cnpj_beneficiario || '',
          confidence: parsedData.cnpj_beneficiario ? 90 : 0,
          source: 'OpenAI GPT-4o'
        }
      },
      overallConfidence,
      lowConfidenceFields: Object.entries({
        valor: confiancaValor,
        vencimento: confiancaVencimento,
        beneficiario: confiancaBeneficiario
      }).filter(([_, conf]) => conf < 80).map(([field]) => field),
      needsReview: overallConfidence < 85,
      observacoes: parsedData.observacoes || null,
      metodo_extracao: parsedData.metodo_extracao_valor || 'campo_valor',
      // Also include simple format for backward compatibility
      amount: isNaN(amount) ? 0 : amount,
      due_date: dueDate,
      beneficiario: parsedData.beneficiario || null,
      description: parsedData.descricao || null
    };

    console.log('[process-boleto] Resultado final - Confiança:', overallConfidence, '%, Método:', parsedData.metodo_extracao_valor);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-boleto] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
