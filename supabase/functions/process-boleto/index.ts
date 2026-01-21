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

    const systemPrompt = `Você é um especialista em OCR e extração de dados de documentos financeiros brasileiros.
Sua tarefa é analisar imagens de boletos, notas fiscais, cupons fiscais e faturas para extrair informações precisas.

REGRAS CRÍTICAS DE EXTRAÇÃO:

1. VALOR TOTAL:
   - Procure por: "VALOR TOTAL", "TOTAL A PAGAR", "VALOR DO DOCUMENTO", "TOTAL", "VLR TOTAL"
   - Em notas fiscais, procure o valor total no rodapé ou resumo
   - O valor deve ser o MAIOR valor monetário principal do documento
   - Formato brasileiro: 1.234,56 (ponto para milhar, vírgula para decimal)
   - NUNCA confunda com valores parciais, descontos ou subtotais

2. DATA DE VENCIMENTO:
   - Procure por: "VENCIMENTO", "DATA VENCIMENTO", "VENC", "DT VENC", "PAGAR ATÉ"
   - Formato: DD/MM/AAAA ou DD/MM/YY
   - Se não encontrar vencimento, procure "DATA DE EMISSÃO" ou "EMISSÃO"

3. BENEFICIÁRIO/FORNECEDOR:
   - Procure por: "BENEFICIÁRIO", "CEDENTE", "FAVORECIDO", "RAZÃO SOCIAL", "FORNECEDOR"
   - Deve ser o nome da empresa/pessoa que receberá o pagamento
   - NUNCA use o nome do pagador/sacado

4. DESCRIÇÃO:
   - Extraia uma descrição breve do que se trata o documento
   - Use informações como: número do documento, serviço, produto, referência

5. NÚMERO DO DOCUMENTO:
   - Procure por: "Nº", "NÚMERO", "DOC", "NF", "NOTA FISCAL", "BOLETO"

RETORNE APENAS JSON VÁLIDO no formato:
{
  "valor": 0.00,
  "vencimento": "DD/MM/AAAA",
  "beneficiario": "Nome do beneficiário",
  "descricao": "Descrição do documento",
  "numero_documento": "123456",
  "confianca": {
    "valor": "alta|media|baixa",
    "vencimento": "alta|media|baixa",
    "beneficiario": "alta|media|baixa"
  }
}

Se não conseguir extrair um campo, use null para o valor.
IMPORTANTE: Retorne APENAS o JSON, sem markdown, sem explicações.`;

    const userPrompt = `Analise esta imagem de documento financeiro e extraia as informações.
${tipoNota === 'SEM_NOTA' ? 'ATENÇÃO: Este é um documento SEM NOTA FISCAL. Se não encontrar data de vencimento, deixe como null.' : ''}

Extraia:
1. Valor total a pagar (em número decimal, ex: 1234.56)
2. Data de vencimento (formato DD/MM/AAAA)
3. Nome do beneficiário/fornecedor
4. Descrição do documento
5. Número do documento

Retorne APENAS o JSON, sem formatação markdown.`;

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
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.1,
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

    // Process extracted data
    let amount = 0;
    if (parsedData.valor !== null && parsedData.valor !== undefined) {
      if (typeof parsedData.valor === 'string') {
        // Handle Brazilian format: 1.234,56
        amount = parseFloat(parsedData.valor.replace(/\./g, '').replace(',', '.'));
      } else {
        amount = parseFloat(parsedData.valor);
      }
    }

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
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          dueDate = date.toISOString().split('T')[0];
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

    // Build response in original format for compatibility
    const result = {
      success: true,
      extracted: {
        amount: {
          value: isNaN(amount) ? '' : amount.toString().replace('.', ','),
          confidence: parsedData.confianca?.valor === 'alta' ? 95 : parsedData.confianca?.valor === 'media' ? 75 : 50,
          source: 'OpenAI GPT-4o'
        },
        due_date: {
          value: dueDate || '',
          confidence: parsedData.confianca?.vencimento === 'alta' ? 95 : parsedData.confianca?.vencimento === 'media' ? 75 : 50,
          source: 'OpenAI GPT-4o'
        },
        beneficiario: {
          value: parsedData.beneficiario || '',
          confidence: parsedData.confianca?.beneficiario === 'alta' ? 95 : parsedData.confianca?.beneficiario === 'media' ? 75 : 50,
          source: 'OpenAI GPT-4o'
        },
        description: {
          value: parsedData.descricao || parsedData.numero_documento || '',
          confidence: 80,
          source: 'OpenAI GPT-4o'
        },
        numero_movimento: {
          value: parsedData.numero_documento || '',
          confidence: 70,
          source: 'OpenAI GPT-4o'
        }
      },
      overallConfidence: 85,
      lowConfidenceFields: [],
      needsReview: false,
      // Also include simple format for backward compatibility
      amount: isNaN(amount) ? 0 : amount,
      due_date: dueDate,
      beneficiario: parsedData.beneficiario || null,
      description: parsedData.descricao || null
    };

    console.log('[process-boleto] Resultado final:', JSON.stringify(result));

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
