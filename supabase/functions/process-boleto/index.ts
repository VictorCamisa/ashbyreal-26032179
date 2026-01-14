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

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    console.log('[process-boleto] Processando boleto, tipo:', tipoNota);

    // PROMPT OTIMIZADO COM EXEMPLOS E REGRAS ESPECÍFICAS
    const prompt = `Você é um especialista em OCR de documentos financeiros brasileiros.
Analise esta imagem de boleto/nota fiscal com MÁXIMA PRECISÃO.

═══════════════════════════════════════════
📍 LOCAIS TÍPICOS DE CADA CAMPO
═══════════════════════════════════════════

1. **BENEFICIÁRIO/CEDENTE** (quem RECEBE o dinheiro):
   - Geralmente no TOPO do documento, logo abaixo do logo do banco
   - Campos: "CEDENTE", "BENEFICIÁRIO", "RAZÃO SOCIAL", "FORNECEDOR"
   - Em notas fiscais: aparece como emissor da NF
   - EXEMPLOS: "CERVEJARIA ASHBY LTDA", "AMBEV S/A", "HEINEKEN BRASIL"
   - ⚠️ NÃO é quem paga (sacado/pagador)

2. **VALOR** (CRÍTICO - máxima atenção):
   - Campos: "VALOR DO DOCUMENTO", "TOTAL A PAGAR", "VALOR TOTAL", "(=) VALOR TOTAL"
   - Geralmente em destaque, negrito ou maior
   - Formato brasileiro: 1.234,56 (ponto = milhar, vírgula = decimal)
   - Em notas: procure "TOTAL DA NOTA" ou soma no rodapé
   - ⚠️ CONFIRA: some os itens para validar o total

3. **DATA DE VENCIMENTO**:
   - Campos: "VENCIMENTO", "DATA VENC.", "VENC."
   - ${tipoNota === 'SEM_NOTA' ? 'Se não houver, calcule: DATA EMISSÃO + 15 dias' : 'Deve estar explícita no documento'}

4. **NÚM. MOV / DOCUMENTO**:
   - Campos: "NÚM.MOV", "Nº MOV", "NÚMERO DO DOCUMENTO", "DOC Nº"
   - Geralmente no cabeçalho ou próximo à data
   - Pode ter letras e números

5. **DATA DE EMISSÃO**:
   - Campos: "EMISSÃO", "DATA", "EMITIDO EM"
   - Importante para documentos SEM NOTA

6. **ITENS/PRODUTOS** (se houver):
   - Cada linha com: descrição, quantidade, valor unitário, valor total
   - A SOMA dos valores totais deve ser igual ao VALOR TOTAL

═══════════════════════════════════════════
📊 FORMATO DE RESPOSTA (JSON)
═══════════════════════════════════════════

{
  "amount": {
    "value": "2.108,00",
    "confidence": 95,
    "source": "Campo 'VALOR TOTAL' no rodapé"
  },
  "due_date": {
    "value": "2025-01-20",
    "confidence": 90,
    "source": "Campo 'VENCIMENTO' no cabeçalho"
  },
  "emission_date": {
    "value": "2025-01-05",
    "confidence": 85,
    "source": "Campo 'DATA EMISSÃO'"
  },
  "beneficiario": {
    "value": "CERVEJARIA ASHBY LTDA",
    "confidence": 95,
    "source": "Campo 'CEDENTE' no topo"
  },
  "sacado": {
    "value": "TAUBATE CHOPP COMERCIO",
    "confidence": 80,
    "source": "Campo 'SACADO'"
  },
  "description": {
    "value": "NF 12345 - Compra de chopp",
    "confidence": 90,
    "source": "Inferido dos itens"
  },
  "numero_movimento": {
    "value": "122653",
    "confidence": 85,
    "source": "Campo 'NÚM.MOV'"
  },
  "cnpj_beneficiario": {
    "value": "12.345.678/0001-99",
    "confidence": 90,
    "source": "Abaixo do nome do cedente"
  },
  "numero_nf": {
    "value": "12345",
    "confidence": 95,
    "source": "Campo 'NOTA FISCAL Nº'"
  },
  "numero_pedido": {
    "value": "PED-001",
    "confidence": 70,
    "source": "Campo 'PEDIDO'"
  },
  "itens": [
    {
      "descricao": "CHOPP PILSEN BARRIL 30L",
      "quantidade": "10",
      "valor_unitario": "200,00",
      "valor_total": "2.000,00",
      "confidence": 90
    }
  ],
  "validacao": {
    "soma_itens": "2.000,00",
    "valor_documento": "2.108,00",
    "diferenca": "108,00",
    "observacao": "Diferença pode ser frete ou impostos"
  }
}

═══════════════════════════════════════════
⚠️ REGRAS CRÍTICAS
═══════════════════════════════════════════

1. CONFIDENCE (0-100):
   - 95-100: Leitura clara, campo identificado
   - 80-94: Leitura boa, alta certeza
   - 60-79: Leitura parcial, precisa revisão
   - <60: Incerto, destacar para revisão manual

2. Se não encontrar um campo: { "value": "", "confidence": 0, "source": "Não encontrado" }

3. NUNCA inverta beneficiário (recebe) com sacado (paga)

4. Para valores, SEMPRE use formato brasileiro (1.234,56)

5. Responda APENAS o JSON, sem markdown ou explicações`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
        ],
        max_tokens: 3000,
        temperature: 0.1, // Baixa temperatura para maior precisão
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[process-boleto] Erro OpenAI:', response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    console.log('[process-boleto] Tokens usados:', data.usage);

    const content = data.choices?.[0]?.message?.content || '';
    
    let extracted: any = {
      amount: { value: '', confidence: 0, source: '' },
      due_date: { value: '', confidence: 0, source: '' },
      emission_date: { value: '', confidence: 0, source: '' },
      beneficiario: { value: '', confidence: 0, source: '' },
      sacado: { value: '', confidence: 0, source: '' },
      description: { value: '', confidence: 0, source: '' },
      numero_movimento: { value: '', confidence: 0, source: '' },
      cnpj_beneficiario: { value: '', confidence: 0, source: '' },
      numero_nf: { value: '', confidence: 0, source: '' },
      numero_pedido: { value: '', confidence: 0, source: '' },
      itens: [],
      validacao: null
    };

    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);
      
      // Merge parsed data
      extracted = { ...extracted, ...parsed };
      
      // Format amount if needed
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
          emission.setDate(emission.getDate() + 15);
          extracted.due_date = {
            value: emission.toISOString().split('T')[0],
            confidence: 70,
            source: 'Calculado: emissão + 15 dias'
          };
          console.log('[process-boleto] Vencimento calculado:', extracted.due_date.value);
        } catch (e) {
          console.error('[process-boleto] Erro ao calcular vencimento:', e);
        }
      }

      // Calculate overall confidence
      const fields = ['amount', 'due_date', 'beneficiario', 'description'];
      const confidences = fields.map(f => extracted[f]?.confidence || 0);
      const overallConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / fields.length);

      // Flag low confidence fields
      const lowConfidenceFields = fields.filter(f => (extracted[f]?.confidence || 0) < 80);

      console.log('[process-boleto] Extração completa. Confiança geral:', overallConfidence, '%. Campos baixa confiança:', lowConfidenceFields);

      return new Response(
        JSON.stringify({ 
          success: true, 
          extracted,
          overallConfidence,
          lowConfidenceFields,
          needsReview: overallConfidence < 80 || lowConfidenceFields.length > 0,
          raw: content 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (parseError) {
      console.error('[process-boleto] Erro ao parsear JSON:', parseError, 'Content:', content);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao interpretar resposta da IA',
          raw: content,
          extracted 
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