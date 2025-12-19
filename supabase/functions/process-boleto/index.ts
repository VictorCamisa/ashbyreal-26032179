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

    console.log('Processando boleto com OpenAI GPT-4o, tipo:', tipoNota);

    const prompt = `Você é um especialista em leitura de boletos bancários e notas fiscais brasileiras.
Analise a imagem com MÁXIMA ATENÇÃO e extraia TODAS as informações disponíveis.

**REGRAS CRÍTICAS DE EXTRAÇÃO:**

1. **BENEFICIÁRIO/CEDENTE** (MUITO IMPORTANTE):
   - Este é o nome da EMPRESA QUE VAI RECEBER O PAGAMENTO (quem emitiu o boleto/nota)
   - Geralmente aparece como "CEDENTE", "BENEFICIÁRIO", "FORNECEDOR", "RAZÃO SOCIAL"
   - NÃO confunda com o PAGADOR/SACADO (quem vai pagar)
   - Se for uma cervejaria, o beneficiário será a cervejaria (ex: "CERVEJARIA ARTESANAL LTDA")
   - O cliente que paga (ex: "Taubaté Chopp") NÃO é o beneficiário

2. **VALOR** (CRÍTICO):
   - Procure por "VALOR DO DOCUMENTO", "TOTAL A PAGAR", "VALOR TOTAL", "TOTAL"
   - Extraia o valor EXATO, sem modificar
   - Use vírgula como separador decimal (padrão brasileiro)
   - Inclua os centavos

3. **VENCIMENTO**:
   - Procure por "DATA DE VENCIMENTO", "VENCIMENTO", "VENC."
   - ${tipoNota === 'SEM_NOTA' ? 'Se NÃO houver data de vencimento visível, calcule como DATA DE EMISSÃO + 15 dias' : 'Extraia a data exata do documento'}

4. **NÚM.MOV / NÚMERO DO DOCUMENTO** (MUITO IMPORTANTE para ${tipoNota === 'SEM_NOTA' ? 'SEM NOTA' : 'COM NOTA'}):
   - Procure por: "NÚM.MOV", "Nº MOV", "NUM MOV", "NÚMERO MOVIMENTO", "Nº DOCUMENTO", "NÚMERO DO DOCUMENTO"
   - Este é um identificador ÚNICO do documento
   - Geralmente está próximo da data ou no cabeçalho
   - É OBRIGATÓRIO extrair este campo

5. **DATA DE EMISSÃO**:
   - Procure por "EMISSÃO", "DATA EMISSÃO", "DATA"
   - Importante especialmente para documentos SEM NOTA

**ITENS DA NOTA:**
Extraia TODOS os produtos/serviços listados com:
- Descrição completa
- Quantidade
- Valor unitário
- Valor total

Responda APENAS em JSON válido:
{
  "amount": "valor com vírgula decimal, ex: 2.108,00",
  "due_date": "YYYY-MM-DD",
  "emission_date": "YYYY-MM-DD se disponível",
  "beneficiario": "nome da empresa que RECEBE o pagamento",
  "sacado": "nome de quem PAGA (cliente)",
  "description": "descrição resumida do documento",
  "numero_movimento": "NÚM.MOV ou Número do Documento",
  "cnpj_beneficiario": "CNPJ do beneficiário",
  "numero_nf": "número da nota fiscal",
  "numero_pedido": "número do pedido",
  "itens": [
    {
      "descricao": "nome do produto",
      "quantidade": "qtd",
      "valor_unitario": "valor",
      "valor_total": "total"
    }
  ]
}

IMPORTANTE:
- Se não encontrar um campo, deixe string vazia ""
- NUNCA inverta beneficiário com sacado
- Responda APENAS o JSON, sem markdown`;

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
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: image,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API OpenAI:', response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da OpenAI:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content || '';
    
    let extracted = {
      amount: '',
      due_date: '',
      emission_date: '',
      beneficiario: '',
      sacado: '',
      description: '',
      numero_movimento: '',
      cnpj_beneficiario: '',
      numero_nf: '',
      numero_pedido: '',
      itens: []
    };

    try {
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      extracted = JSON.parse(jsonStr);
      
      // Format amount if needed
      if (extracted.amount) {
        extracted.amount = extracted.amount.toString()
          .replace('R$', '')
          .replace(/\s/g, '')
          .trim();
      }

      // If SEM_NOTA and no due_date but has emission_date, calculate +15 days
      if (tipoNota === 'SEM_NOTA' && !extracted.due_date && extracted.emission_date) {
        try {
          const emission = new Date(extracted.emission_date);
          emission.setDate(emission.getDate() + 15);
          extracted.due_date = emission.toISOString().split('T')[0];
          console.log('Vencimento calculado (+15 dias):', extracted.due_date);
        } catch (e) {
          console.error('Erro ao calcular vencimento:', e);
        }
      }

      console.log('Dados extraídos com sucesso:', extracted);
    } catch (parseError) {
      console.error('Erro ao parsear JSON:', parseError, 'Content:', content);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extracted,
        raw: content 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
