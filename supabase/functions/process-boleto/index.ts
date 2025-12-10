import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
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

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    console.log('Processando boleto', tipoNota);

    // Build the prompt to extract all fields from boleto
    const prompt = `Você é um especialista em leitura de boletos bancários e notas fiscais brasileiras.
Analise a imagem com atenção e extraia TODAS as informações disponíveis:

**CAMPOS OBRIGATÓRIOS:**
1. **Valor** - Valor total do documento/boleto (campo "TOTAL", "Valor do Documento", "Total à Pagar")
2. **Vencimento** - Data de vencimento (campo "VENCIMENTO")
3. **Beneficiário/Cedente** - Nome da empresa/pessoa que vai receber o pagamento
4. **Descrição** - O que está sendo cobrado (produtos, serviços, descrição da mercadoria)
5. **NÚM.MOV** - MUITO IMPORTANTE: Número do movimento/identificação que aparece geralmente ACIMA da data de vencimento. Pode aparecer como "NÚM.MOV:", "Nº MOV", "NUM MOV", "Número Movimento". Este é um número de identificação único do documento (ex: 122653).

**CAMPOS ADICIONAIS (se disponíveis):**
- CNPJ do beneficiário
- Número da nota fiscal
- Número do pedido
- Código do cliente
- Itens/produtos listados
- Código de barras (números)

${tipoNota === 'COM_NOTA' ? 'Este documento POSSUI nota fiscal - extraia também informações da NF como número, série, itens.' : 'Este é um documento SEM nota fiscal - PRESTE ATENÇÃO ESPECIAL ao NÚM.MOV que é o identificador principal.'}

Responda APENAS em formato JSON com a seguinte estrutura:
{
  "amount": "valor numérico com vírgula como separador decimal, ex: 2.108,00",
  "due_date": "data no formato YYYY-MM-DD",
  "beneficiario": "nome completo do beneficiário/cedente",
  "description": "descrição detalhada incluindo produtos/serviços cobrados",
  "numero_movimento": "NÚM.MOV - número de identificação do movimento (MUITO IMPORTANTE para documentos sem nota)",
  "cnpj": "CNPJ do beneficiário se disponível",
  "numero_nf": "número da nota fiscal se disponível",
  "numero_pedido": "número do pedido se disponível",
  "codigo_cliente": "código do cliente se disponível",
  "itens": "lista de itens/produtos se disponível"
}

IMPORTANTE: 
- O campo "numero_movimento" (NÚM.MOV) é CRÍTICO e deve ser extraído sempre que visível.
- Se não conseguir identificar algum campo, deixe como string vazia.
- Responda APENAS o JSON, sem markdown ou explicações.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
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
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API:', errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da IA:', JSON.stringify(data, null, 2));

    const content = data.choices?.[0]?.message?.content || '';
    
    // Try to parse the JSON from the response
    let extracted = {
      amount: '',
      due_date: '',
      beneficiario: '',
      description: '',
    };

    try {
      // Remove possible markdown code blocks
      const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      extracted = JSON.parse(jsonStr);
      
      // Format amount if needed (remove R$ and spaces)
      if (extracted.amount) {
        extracted.amount = extracted.amount.toString()
          .replace('R$', '')
          .replace(/\s/g, '')
          .trim();
      }

      console.log('Dados extraídos:', extracted);
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
