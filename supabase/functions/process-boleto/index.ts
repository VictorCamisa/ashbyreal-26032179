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

    // Build the prompt based on boleto type
    const prompt = `Você é um especialista em leitura de boletos bancários brasileiros.
Analise a imagem do boleto e extraia as seguintes informações:

1. **Valor do boleto** (campo "Valor do Documento" ou similar)
2. **Data de vencimento** (campo "Vencimento")
3. **Beneficiário/Cedente** (quem vai receber o pagamento)
4. **Descrição/Finalidade** (se houver informação sobre o que é o boleto)

${tipoNota === 'COM_NOTA' ? 'Este boleto possui nota fiscal anexa.' : 'Este boleto NÃO possui nota fiscal.'}

Responda APENAS em formato JSON com a seguinte estrutura:
{
  "amount": "valor numérico com vírgula como separador decimal, ex: 136,03",
  "due_date": "data no formato YYYY-MM-DD",
  "beneficiario": "nome do beneficiário/cedente",
  "description": "descrição breve do boleto"
}

Se não conseguir identificar algum campo, deixe como string vazia.
Responda APENAS o JSON, sem markdown ou explicações.`;

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
