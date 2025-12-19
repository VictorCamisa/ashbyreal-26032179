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
            content: `Você é um assistente especializado em extrair dados de pedidos de venda da TAUBATÉ CHOPP.
Analise a imagem do formulário de pedido e extraia TODOS os dados com precisão.

## FORMATO DO FORMULÁRIO TAUBATÉ CHOPP

O formulário tem a seguinte estrutura:
- **Cabeçalho**: Logo ASHBY/TAUBATÉ CHOPP, Nº do pedido, Data, Vendedor
- **Cliente**: Nome no campo "Cliente:", pode ter empresa, CNPJ/CPF, Endereço, Bairro, Cidade, Estado, Fone
- **Tabela de Produtos**: Colunas = DESCRIÇÃO | QUANT. | BARRIS | VALOR UNIT. | TOTAL
  - "Chopp Claro" (Pilsen) - barris de 10L, 20L, 30L ou 50L
  - "Chopp Vinho/Vino" - barris de 10L, 20L, 30L ou 50L
  - "Chopp IPA" - barris de 10L, 20L, 30L ou 50L
  - "Chopp Escuro" - barris de 10L, 20L, 30L ou 50L
  - "Chopperia Elétrica" - equipamento (unidades)
  - "Cilindro CO²" - equipamento (unidades)
  - "Frete" - valor do frete
  - "Copos descartáveis" - pacotes de copos
- **Seção ENTREGA**: DATA de entrega, Período (Manhã/Tarde/Integral)
- **Seção PAGAMENTO**: Checkboxes para Dinheiro, Cartão, PIX, Boleto

## REGRA CRÍTICA - COMO INTERPRETAR A COLUNA "BARRIS":

A coluna BARRIS contém a notação NxTAMANHO onde:
- N = QUANTIDADE de barris (1, 2, 3, 4...)
- TAMANHO = capacidade em litros (10, 20, 30 ou 50)

EXEMPLOS CORRETOS:
| BARRIS escrito | Quantidade | Tamanho barril |
|----------------|------------|----------------|
| 1x50           | 1          | 50             |
| 2x50           | 2          | 50             |
| 1x30           | 1          | 30             |
| 2x30           | 2          | 30             |
| 3x20           | 3          | 20             |
| 4x10           | 4          | 10             |
| 1x50 + 1x30    | 2 (separar em 2 itens!) | 50 e 30 |

A coluna "QUANT." às vezes mostra litros totais (ex: 50, 100), mas você deve IGNORAR isso para chopp e usar a notação de barris.

## MÚLTIPLOS TAMANHOS DO MESMO TIPO:
Se um produto tem "1x50 + 1x30", crie DOIS itens separados:
1. Chopp X - quantidade: 1, tamanhoBarril: 50
2. Chopp X - quantidade: 1, tamanhoBarril: 30

## PRODUTOS DISPONÍVEIS NO SISTEMA (para matching):
${productList}

## DATAS - ATENÇÃO:
- Data do pedido: no cabeçalho, campo "Data:" 
- Data de entrega: na seção ENTREGA, campo "DATA:"
- Converta para formato YYYY-MM-DD (ex: 12/12/2025 → 2025-12-12)

## DICAS DE LEITURA:
- "M" antes de valores = "R$" (ex: "M 590,00" = R$ 590,00)
- Verifique carimbo "LANÇADO" = pedido já processado
- O preço unitário na foto é de referência - usaremos o preço do produto cadastrado no sistema
- Leia TODOS os campos do formulário: nome do vendedor, telefone, endereço, bairro, cidade, estado, CEP

## INSTRUÇÕES FINAIS:
1. Extraia o número do pedido do campo "Nº" no canto superior
2. Para cada tipo de chopp com anotação de barris, crie um item
3. Se tiver múltiplos tamanhos do mesmo chopp, crie itens separados
4. Para copos, frete, equipamentos: quantidade em unidades normais
5. Identifique qual forma de pagamento está marcada (X ou ✓)`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem de pedido da Taubaté Chopp e extraia todos os dados. Preste atenção especial: 1) notação de barris NxTAMANHO, 2) datas, 3) dados do cliente completos, 4) forma de pagamento marcada.'
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
              description: 'Extrai dados estruturados de um pedido de venda da Taubaté Chopp',
              parameters: {
                type: 'object',
                properties: {
                  numeroPedido: { type: 'string', description: 'Número do pedido (campo Nº no canto superior)' },
                  dataPedido: { type: 'string', description: 'Data do pedido no formato YYYY-MM-DD (do cabeçalho)' },
                  vendedor: { type: 'string', description: 'Nome do vendedor' },
                  cliente: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string', description: 'Nome do cliente ou empresa' },
                      telefone: { type: 'string', description: 'Telefone do cliente com DDD' },
                      endereco: { type: 'string', description: 'Endereço/logradouro' },
                      numero: { type: 'string', description: 'Número do endereço' },
                      bairro: { type: 'string', description: 'Bairro' },
                      cidade: { type: 'string', description: 'Cidade' },
                      estado: { type: 'string', description: 'Estado (UF, 2 letras)' },
                      cep: { type: 'string', description: 'CEP' },
                      cnpjCpf: { type: 'string', description: 'CNPJ ou CPF' }
                    },
                    required: ['nome']
                  },
                  localEntrega: { type: 'string', description: 'Local de entrega se diferente do endereço' },
                  itens: {
                    type: 'array',
                    description: 'Lista de itens do pedido. Para cada tipo de chopp com tamanho diferente, criar um item separado.',
                    items: {
                      type: 'object',
                      properties: {
                        tipoChopp: { 
                          type: 'string', 
                          description: 'Tipo do chopp: CLARO/PILSEN, VINHO, IPA, ESCURO, PALE ALE, WEISS, LIMAO/ICE, ou null para não-chopp',
                          enum: ['CLARO', 'VINHO', 'IPA', 'ESCURO', 'PALE_ALE', 'WEISS', 'LIMAO', 'OUTRO', null]
                        },
                        nomeProduto: { type: 'string', description: 'Nome original do produto como está no formulário' },
                        quantidade: { 
                          type: 'integer', 
                          description: 'NÚMERO DE BARRIS (1, 2, 3...) extraído da notação NxTAMANHO. Ex: "2x50" = 2' 
                        },
                        tamanhoBarril: { 
                          type: 'integer', 
                          description: 'Tamanho em litros (10, 20, 30 ou 50) extraído da notação NxTAMANHO. Ex: "2x50" = 50',
                          enum: [10, 20, 30, 50, null]
                        },
                        detalhesBarris: { type: 'string', description: 'Anotação original dos barris como escrita (ex: 1x50, 2x30)' },
                        precoFoto: { type: 'number', description: 'Preço mostrado na foto (apenas para referência)' }
                      },
                      required: ['nomeProduto', 'quantidade']
                    }
                  },
                  valorTotalFoto: { type: 'number', description: 'Valor total mostrado na foto (apenas para referência)' },
                  metodoPagamento: { 
                    type: 'string', 
                    enum: ['pix', 'cartao', 'dinheiro', 'boleto', null],
                    description: 'Forma de pagamento MARCADA (com X ou ✓) no formulário'
                  },
                  dataEntrega: { type: 'string', description: 'Data de ENTREGA no formato YYYY-MM-DD (seção ENTREGA)' },
                  periodoEntrega: { 
                    type: 'string',
                    enum: ['manha', 'tarde', 'integral', null],
                    description: 'Período de entrega marcado'
                  },
                  observacoes: { type: 'string', description: 'Observações escritas no formulário' },
                  jaLancado: { type: 'boolean', description: 'Se tem carimbo LANÇADO' }
                },
                required: ['itens', 'cliente']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_order_data' } },
        max_tokens: 4000
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

    // Match products with database - using tipoChopp and tamanhoBarril
    const matchedItems = [];
    for (const item of extractedData.itens || []) {
      const searchName = item.nomeProduto?.toLowerCase() || '';
      const tipoChopp = item.tipoChopp; // CLARO, VINHO, IPA, ESCURO, etc.
      const tamanhoBarril = item.tamanhoBarril; // 10, 20, 30, or 50
      
      // Find best matching product
      let bestMatch = null;
      let bestScore = 0;

      for (const produto of produtos || []) {
        const prodName = produto.nome.toLowerCase();
        let score = 0;
        
        // Check if this is a chopp product
        const prodIsChopp = prodName.includes('chopp') || prodName.includes('chope');
        const itemIsChopp = tipoChopp && tipoChopp !== 'OUTRO';
        
        if (itemIsChopp && prodIsChopp && tamanhoBarril) {
          // Check if product name contains the barrel size
          const sizePatterns = [
            `${tamanhoBarril}lt`, 
            `${tamanhoBarril} lt`,
            `${tamanhoBarril}l`,
            `${tamanhoBarril} l`,
            `${tamanhoBarril}lts`,
            `${tamanhoBarril} lts`
          ];
          const prodHasSize = sizePatterns.some(p => prodName.includes(p));
          
          // Check chopp type match based on tipoChopp enum
          const typeMatchers: Record<string, string[]> = {
            'CLARO': ['claro', 'pilsen', 'puro malte'],
            'VINHO': ['vinho', 'vino'],
            'IPA': ['ipa', 'nirvana'],
            'ESCURO': ['escuro', 'dark', 'porter'],
            'PALE_ALE': ['pale ale', 'pale'],
            'WEISS': ['weiss', 'trigo', 'wheat'],
            'LIMAO': ['limão', 'limao', 'ice']
          };
          
          const patterns = typeMatchers[tipoChopp] || [];
          const typeMatch = patterns.some(p => prodName.includes(p));
          
          if (prodHasSize && typeMatch) {
            score = 100; // Perfect match: type + size
          } else if (typeMatch && !prodHasSize) {
            // Type matches but not size - check if product has the wrong size
            const hasDifferentSize = [10, 20, 30, 50]
              .filter(s => s !== tamanhoBarril)
              .some(s => prodName.includes(`${s}l`));
            score = hasDifferentSize ? 0 : 50; // Only partial if no size specified
          } else if (prodHasSize && !typeMatch) {
            score = 20; // Only size matches, wrong type
          }
        } else if (!itemIsChopp) {
          // Non-chopp products: simple text matching
          if (prodName.includes(searchName) || searchName.includes(prodName.split(' ')[0])) {
            score = 100;
          } else {
            // Word overlap scoring
            const prodWords = prodName.split(/\s+/);
            const searchWords = searchName.split(/\s+/);
            const overlap = prodWords.filter((w: string) => 
              searchWords.some((sw: string) => sw.includes(w) || w.includes(sw))
            ).length;
            if (overlap > 0) {
              score = Math.min((overlap / Math.max(prodWords.length, searchWords.length)) * 100, 80);
            }
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = produto;
        }
      }

      matchedItems.push({
        nomeProdutoOriginal: item.nomeProduto,
        tipoChopp: item.tipoChopp,
        quantidade: item.quantidade || 1,
        tamanhoBarril: item.tamanhoBarril,
        detalhesBarris: item.detalhesBarris,
        // Use the price from the MATCHED product, not from the photo
        precoUnitario: bestMatch?.preco || item.precoFoto || null,
        produtoEncontrado: bestMatch ? {
          id: bestMatch.id,
          nome: bestMatch.nome,
          preco: bestMatch.preco,
          estoque: bestMatch.estoque
        } : null,
        confiancaMatch: bestScore
      });
    }

    console.log('Matched items:', JSON.stringify(matchedItems, null, 2));

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

    // Calculate total based on matched products
    const valorCalculado = matchedItems.reduce((sum, item) => {
      const preco = item.produtoEncontrado?.preco || item.precoUnitario || 0;
      return sum + (preco * item.quantidade);
    }, 0);

    const result = {
      success: true,
      dadosExtraidos: {
        numeroPedido: extractedData.numeroPedido,
        dataPedido: extractedData.dataPedido,
        vendedor: extractedData.vendedor,
        cliente: clienteInfo,
        localEntrega: extractedData.localEntrega,
        itens: matchedItems,
        valorTotalFoto: extractedData.valorTotalFoto,
        valorCalculado: valorCalculado,
        metodoPagamento: extractedData.metodoPagamento,
        dataEntrega: extractedData.dataEntrega,
        periodoEntrega: extractedData.periodoEntrega,
        observacoes: extractedData.observacoes,
        jaLancado: extractedData.jaLancado || false,
        confianca: matchedItems.every(i => i.confiancaMatch >= 80) ? 90 : 
                   matchedItems.some(i => i.confiancaMatch >= 80) ? 70 : 50
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
