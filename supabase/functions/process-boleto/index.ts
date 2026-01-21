import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { image, tipoNota } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Imagem não fornecida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('[process-boleto] Processando boleto, tipo:', tipoNota);

    // PROMPT EXTREMAMENTE DETALHADO PARA MÁXIMA PRECISÃO
    const systemPrompt = `Você é um especialista em OCR de documentos financeiros brasileiros com 20 anos de experiência.
Sua tarefa é extrair dados de boletos bancários e notas fiscais com MÁXIMA PRECISÃO.

IMPORTANTE: Analise a imagem INTEIRA antes de responder. Não faça suposições.`;

    const userPrompt = `Analise esta imagem de documento financeiro (${tipoNota === 'COM_NOTA' ? 'BOLETO COM NOTA FISCAL' : 'BOLETO SEM NOTA FISCAL'}) e extraia os dados.

═══════════════════════════════════════════════════════════════
🔍 INSTRUÇÕES DE EXTRAÇÃO - LEIA COM ATENÇÃO
═══════════════════════════════════════════════════════════════

1. **VALOR TOTAL** (PRIORIDADE MÁXIMA):
   - Procure por: "VALOR DO DOCUMENTO", "TOTAL A PAGAR", "(=) VALOR TOTAL", "VALOR TOTAL DA NOTA"
   - Geralmente está em DESTAQUE (negrito, maior, ou em caixa)
   - Formato brasileiro: 1.234,56 (ponto separa milhar, vírgula separa decimal)
   - NÃO confunda com valores parciais, descontos ou impostos
   - Se houver uma tabela de itens, o valor total geralmente está NO FINAL

2. **DATA DE VENCIMENTO**:
   - Procure por: "VENCIMENTO", "VENC.", "DATA VENCIMENTO", "DT VENC"
   - Formato: DD/MM/AAAA ou AAAA-MM-DD
   - ${tipoNota === 'SEM_NOTA' ? 'Se não encontrar, procure DATA DE EMISSÃO e adicione 15 dias' : 'Deve estar no documento'}

3. **BENEFICIÁRIO/CEDENTE** (quem RECEBE o pagamento):
   - Procure por: "CEDENTE", "BENEFICIÁRIO", "RAZÃO SOCIAL DO CEDENTE"
   - Geralmente está no TOPO do boleto, abaixo do logo do banco
   - É a empresa que EMITIU o boleto/nota
   - NÃO confunda com SACADO/PAGADOR (quem paga)
   - Exemplos: "CERVEJARIA ASHBY LTDA", "AMBEV S.A.", "HEINEKEN BRASIL"

4. **NÚMERO DO DOCUMENTO / NÚM. MOV**:
   - Procure por: "NÚM. MOV", "Nº MOV", "NÚMERO DOCUMENTO", "DOC Nº", "NF Nº"
   - Pode estar no cabeçalho ou próximo à data
   - Geralmente são números, mas pode ter letras

5. **DESCRIÇÃO**:
   - Crie uma descrição útil baseada no conteúdo
   - Inclua: tipo de documento, beneficiário resumido, referência
   - Exemplo: "NF 12345 - Ashby - Compra de chopp"

6. **ITENS/PRODUTOS** (se houver tabela):
   - Extraia cada linha com: descrição, quantidade, valor unitário, valor total
   - A SOMA dos valores totais deve ser próxima ao VALOR TOTAL (diferença pode ser frete/impostos)

═══════════════════════════════════════════════════════════════
📊 FORMATO DE RESPOSTA (JSON ESTRITO)
═══════════════════════════════════════════════════════════════

Responda APENAS com um JSON válido, sem markdown, sem explicações:

{
  "amount": {
    "value": "1.234,56",
    "confidence": 95,
    "source": "Campo VALOR TOTAL no rodapé"
  },
  "due_date": {
    "value": "2025-01-20",
    "confidence": 90,
    "source": "Campo VENCIMENTO"
  },
  "emission_date": {
    "value": "2025-01-05",
    "confidence": 85,
    "source": "Campo DATA EMISSÃO"
  },
  "beneficiario": {
    "value": "NOME DA EMPRESA",
    "confidence": 95,
    "source": "Campo CEDENTE no topo"
  },
  "description": {
    "value": "NF 12345 - Descrição resumida",
    "confidence": 90,
    "source": "Inferido do documento"
  },
  "numero_movimento": {
    "value": "123456",
    "confidence": 85,
    "source": "Campo NÚM. MOV"
  },
  "itens": [
    {
      "descricao": "PRODUTO EXEMPLO",
      "quantidade": "10",
      "valor_unitario": "100,00",
      "valor_total": "1.000,00",
      "confidence": 90
    }
  ]
}

═══════════════════════════════════════════════════════════════
⚠️ REGRAS DE CONFIANÇA (confidence)
═══════════════════════════════════════════════════════════════

- 95-100: Texto perfeitamente legível, campo claramente identificado
- 80-94: Boa legibilidade, alta certeza da interpretação
- 60-79: Legibilidade parcial, pode precisar de correção
- 40-59: Texto difícil de ler, baixa certeza
- 0-39: Não encontrado ou ilegível

Se não encontrar um campo, retorne: { "value": "", "confidence": 0, "source": "Não encontrado" }

ATENÇÃO: Valores monetários SEMPRE no formato brasileiro (1.234,56). Datas em AAAA-MM-DD.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('[process-boleto] Rate limit exceeded');
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('[process-boleto] Payment required');
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos no workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('[process-boleto] Erro Lovable AI:', response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    console.log('[process-boleto] Tokens usados:', data.usage);

    const content = data.choices?.[0]?.message?.content || '';
    
    let extracted: any = {
      amount: { value: '', confidence: 0, source: '' },
      due_date: { value: '', confidence: 0, source: '' },
      emission_date: { value: '', confidence: 0, source: '' },
      beneficiario: { value: '', confidence: 0, source: '' },
      description: { value: '', confidence: 0, source: '' },
      numero_movimento: { value: '', confidence: 0, source: '' },
      itens: [],
    };

    try {
      // Clean up the response - remove markdown if present
      let jsonStr = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
      
      // Try to find JSON object in response
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Merge parsed data
      extracted = { ...extracted, ...parsed };
      
      // Clean up amount value
      if (extracted.amount?.value) {
        extracted.amount.value = extracted.amount.value.toString()
          .replace('R$', '')
          .replace(/\s/g, '')
          .trim();
      }

      // If SEM_NOTA and no due_date but has emission_date, calculate +15 days
      if (tipoNota === 'SEM_NOTA' && !extracted.due_date?.value && extracted.emission_date?.value) {
        try {
          const emission = new Date(extracted.emission_date.value);
          if (!isNaN(emission.getTime())) {
            emission.setDate(emission.getDate() + 15);
            extracted.due_date = {
              value: emission.toISOString().split('T')[0],
              confidence: 70,
              source: 'Calculado: emissão + 15 dias'
            };
            console.log('[process-boleto] Vencimento calculado:', extracted.due_date.value);
          }
        } catch (e) {
          console.error('[process-boleto] Erro ao calcular vencimento:', e);
        }
      }

      // Calculate overall confidence from critical fields
      const criticalFields = ['amount', 'due_date', 'beneficiario'];
      const confidences = criticalFields.map(f => extracted[f]?.confidence || 0);
      const overallConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / criticalFields.length);

      // Flag low confidence fields (below 80%)
      const allFields = ['amount', 'due_date', 'beneficiario', 'description', 'numero_movimento'];
      const lowConfidenceFields = allFields.filter(f => (extracted[f]?.confidence || 0) < 80);

      console.log('[process-boleto] Extração completa. Confiança geral:', overallConfidence, '%. Campos baixa confiança:', lowConfidenceFields);

      return new Response(
        JSON.stringify({ 
          success: true, 
          extracted,
          overallConfidence,
          lowConfidenceFields,
          needsReview: overallConfidence < 80 || lowConfidenceFields.length > 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (parseError) {
      console.error('[process-boleto] Erro ao parsear JSON:', parseError, 'Content:', content.substring(0, 500));
      
      // Return with empty extraction but flag for manual review
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao interpretar resposta da IA. Preencha manualmente.',
          extracted,
          overallConfidence: 0,
          lowConfidenceFields: ['amount', 'due_date', 'beneficiario', 'description', 'numero_movimento'],
          needsReview: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('[process-boleto] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
