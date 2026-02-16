import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY não configurada');
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

    console.log('Sending image to Lovable AI for analysis...');

    // Call Lovable AI Vision API with tool calling - PROMPT OTIMIZADO PARA MÁXIMA PRECISÃO
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de OCR de ALTA PRECISÃO (99%+) para pedidos da TAUBATÉ CHOPP.
Analise CADA DETALHE da imagem com extremo cuidado. Não invente dados.

## LAYOUT DO FORMULÁRIO TAUBATÉ CHOPP

### CABEÇALHO (topo do formulário):
- Logo ASHBY/TAUBATÉ CHOPP à esquerda
- Campo "Nº" = número do pedido (geralmente manuscrito)
- Campo "Data:" = data do pedido (DD/MM/AAAA)
- Campo "Vendedor:" = nome do vendedor

### SEÇÃO CLIENTE (abaixo do cabeçalho):
- "Cliente:" = Nome completo ou razão social
- "CNPJ/CPF:" = documento (pode estar em branco)
- "Endereço:" = rua/avenida
- "Nº:" = número do endereço
- "Bairro:" 
- "Cidade:" / "Estado:" / "CEP:"
- "Fone:" = telefone com DDD

### TABELA DE PRODUTOS (corpo principal):
| DESCRIÇÃO | QUANT. | BARRIS | VALOR UNIT. | TOTAL |

PRODUTOS TÍPICOS:
- Chopp Claro/Pilsen
- Chopp Vinho (ou Vino)
- Chopp IPA/Nirvana
- Chopp Escuro
- Chopp Weiss
- Choppeira Elétrica
- Cilindro CO² 
- Frete
- Copos Descartáveis

### REGRA CRÍTICA - COLUNA "BARRIS":
A notação NxTAMANHO significa:
- N = quantidade de barris
- TAMANHO = litros (10, 20, 30, 50)

EXEMPLOS:
| Escrito    | Quantidade | Tamanho |
|------------|------------|---------|
| 1x50       | 1          | 50L     |
| 2x50       | 2          | 50L     |
| 1x30       | 1          | 30L     |
| 2x30       | 2          | 30L     |
| 3x20       | 3          | 20L     |
| 1x50+1x30  | SEPARAR EM 2 ITENS! |

IMPORTANTE: Se houver "1x50 + 1x30", criar DOIS itens separados!

### SEÇÃO ENTREGA (abaixo da tabela):
- "DATA:" = data de entrega (diferente da data do pedido!)
- "Período:" checkboxes □ Manhã □ Tarde □ Integral

### SEÇÃO PAGAMENTO:
Checkboxes (procure por ☑ X ou preenchido):
□ Dinheiro □ Cartão □ PIX □ Boleto

### SINAIS VISUAIS:
- Carimbo "LANÇADO" = pedido já processado
- "M" antes de valores = "R$" (ex: "M 590,00" = R$ 590,00)
- Campos riscados = ignorar
- Letra manuscrita pode ser difícil - se incerto, indique

## PRODUTOS DISPONÍVEIS NO SISTEMA:
${productList}

## INSTRUÇÕES FINAIS:
1. Leia TODA a imagem antes de responder
2. Para datas: converta para YYYY-MM-DD
3. Para telefones: mantenha formatação original
4. Se campo ilegível/ausente: use null (NÃO invente!)
5. Marque confiança baixa para campos incertos`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta imagem de pedido da Taubaté Chopp com MÁXIMA PRECISÃO.

CHECKLIST OBRIGATÓRIO:
☐ Número do pedido (campo Nº no canto superior)
☐ Data do pedido (cabeçalho)
☐ Nome do vendedor
☐ TODOS os dados do cliente (nome, telefone, endereço completo)
☐ TODOS os itens com notação de barris correta
☐ Data de ENTREGA (seção Entrega - diferente da data do pedido!)
☐ Período de entrega marcado
☐ Forma de pagamento marcada
☐ Valor total
☐ Observações manuscritas

Se algo estiver ilegível ou ausente, use null. Não invente dados.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                  detail: 'high' // Máxima qualidade de análise
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
        max_tokens: 4000,
        temperature: 0 // Zero para máxima precisão e consistência
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Erro na API Lovable AI: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');

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
