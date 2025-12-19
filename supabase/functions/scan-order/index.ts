import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch products for context
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, nome, preco, estoque, sku, categoria')
      .eq('ativo', true);

    const productList = produtos?.map(p => `- ${p.nome} (SKU: ${p.sku || 'N/A'}, Preço: R$ ${p.preco}, Estoque: ${p.estoque})`).join('\n') || 'Nenhum produto cadastrado';

    console.log('Sending image to OpenAI for analysis...');

    // Call OpenAI Vision API with tool calling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em extrair dados de pedidos de venda a partir de imagens.
Analise a imagem fornecida e extraia todas as informações relevantes sobre o pedido.

PRODUTOS DISPONÍVEIS NO SISTEMA:
${productList}

INSTRUÇÕES:
1. Identifique o cliente (nome, telefone, email, empresa se visível)
2. Identifique os produtos e quantidades do pedido
3. Tente fazer match dos produtos da imagem com os produtos disponíveis no sistema
4. Identifique método de pagamento se visível (pix, cartao, dinheiro, boleto)
5. Identifique observações relevantes
6. Se não conseguir identificar algum dado, deixe como null

IMPORTANTE: Para cada produto, tente encontrar o match mais próximo na lista de produtos disponíveis.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem de pedido e extraia todos os dados estruturados.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_order_data',
              description: 'Extrai dados estruturados de um pedido de venda',
              parameters: {
                type: 'object',
                properties: {
                  cliente: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string', description: 'Nome do cliente' },
                      telefone: { type: 'string', description: 'Telefone do cliente' },
                      email: { type: 'string', description: 'Email do cliente' },
                      empresa: { type: 'string', description: 'Nome da empresa' }
                    }
                  },
                  itens: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        nomeProduto: { type: 'string', description: 'Nome do produto identificado na imagem' },
                        quantidade: { type: 'number', description: 'Quantidade do produto' },
                        precoUnitario: { type: 'number', description: 'Preço unitário se visível' }
                      },
                      required: ['nomeProduto', 'quantidade']
                    }
                  },
                  metodoPagamento: { 
                    type: 'string', 
                    enum: ['pix', 'cartao', 'dinheiro', 'boleto'],
                    description: 'Método de pagamento identificado'
                  },
                  observacoes: { type: 'string', description: 'Observações adicionais do pedido' },
                  dataEntrega: { type: 'string', description: 'Data de entrega se especificada (formato YYYY-MM-DD)' },
                  confianca: {
                    type: 'number',
                    description: 'Nível de confiança na extração (0-100)'
                  }
                },
                required: ['itens']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_order_data' } },
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('Não foi possível extrair dados da imagem');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));

    // Match products with database
    const matchedItems = [];
    for (const item of extractedData.itens || []) {
      const searchName = item.nomeProduto.toLowerCase();
      
      // Find best matching product
      let bestMatch = null;
      let bestScore = 0;

      for (const produto of produtos || []) {
        const prodName = produto.nome.toLowerCase();
        
        // Simple similarity check
        if (prodName.includes(searchName) || searchName.includes(prodName)) {
          const score = 100;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = produto;
          }
        } else {
          // Check word overlap
          const prodWords = prodName.split(/\s+/);
          const searchWords = searchName.split(/\s+/);
          const overlap = prodWords.filter((w: string) => searchWords.some((sw: string) => sw.includes(w) || w.includes(sw))).length;
          const score = (overlap / Math.max(prodWords.length, searchWords.length)) * 100;
          if (score > bestScore && score >= 30) {
            bestScore = score;
            bestMatch = produto;
          }
        }
      }

      matchedItems.push({
        nomeProdutoOriginal: item.nomeProduto,
        quantidade: item.quantidade,
        precoUnitario: item.precoUnitario,
        produtoEncontrado: bestMatch ? {
          id: bestMatch.id,
          nome: bestMatch.nome,
          preco: bestMatch.preco,
          estoque: bestMatch.estoque
        } : null,
        confiancaMatch: bestScore
      });
    }

    // Search for client in database
    let clienteEncontrado = null;
    const clienteInfo = extractedData.cliente;

    if (clienteInfo) {
      // Try to find by phone first
      if (clienteInfo.telefone) {
        const phoneClean = clienteInfo.telefone.replace(/\D/g, '');
        const { data: clienteByPhone } = await supabase
          .from('clientes')
          .select('*')
          .or(`telefone.ilike.%${phoneClean}%,telefone.ilike.%${clienteInfo.telefone}%`)
          .limit(1)
          .single();
        
        if (clienteByPhone) {
          clienteEncontrado = clienteByPhone;
        }
      }

      // Try by email
      if (!clienteEncontrado && clienteInfo.email) {
        const { data: clienteByEmail } = await supabase
          .from('clientes')
          .select('*')
          .ilike('email', clienteInfo.email)
          .limit(1)
          .single();
        
        if (clienteByEmail) {
          clienteEncontrado = clienteByEmail;
        }
      }

      // Try by name (partial match)
      if (!clienteEncontrado && clienteInfo.nome) {
        const { data: clienteByName } = await supabase
          .from('clientes')
          .select('*')
          .ilike('nome', `%${clienteInfo.nome}%`)
          .limit(1)
          .single();
        
        if (clienteByName) {
          clienteEncontrado = clienteByName;
        }
      }
    }

    const result = {
      success: true,
      dadosExtraidos: {
        cliente: clienteInfo,
        itens: matchedItems,
        metodoPagamento: extractedData.metodoPagamento,
        observacoes: extractedData.observacoes,
        dataEntrega: extractedData.dataEntrega,
        confianca: extractedData.confianca || 70
      },
      clienteEncontrado: clienteEncontrado ? {
        id: clienteEncontrado.id,
        nome: clienteEncontrado.nome,
        telefone: clienteEncontrado.telefone,
        email: clienteEncontrado.email,
        empresa: clienteEncontrado.empresa
      } : null,
      produtosDisponiveis: produtos?.map(p => ({
        id: p.id,
        nome: p.nome,
        preco: p.preco,
        estoque: p.estoque
      }))
    };

    console.log('Returning result:', JSON.stringify(result, null, 2));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-order function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar imagem' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
