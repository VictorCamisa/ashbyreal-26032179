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
- **Tabela de Produtos**: 
  - Linha "Chopp Claro" (Pilsen)
  - Linha "Chopp Vinho/Vino"
  - Linha "Chopp IPA"
  - Linha "Chopp Escuro"
  - Linha "Chopperia Elétrica" (equipamento)
  - Linha "Cilindro CO²"
  - Linha "Frete"
  - Linha "Copos descartáveis" (Opcionais)
- **Seção ENTREGA**: DATA de entrega, Período (Manhã/Tarde/Integral)
- **Seção PAGAMENTO**: Checkboxes para Dinheiro, Cartão, PIX, Boleto

## REGRA CRÍTICA DE EXTRAÇÃO DE QUANTIDADE:

A coluna "Quant." contém a QUANTIDADE DE BARRIS, não litros!
O tamanho do barril é anotado separadamente (ex: "1x50" = 1 barril de 50L, "2x30" = 2 barris de 30L).

EXEMPLOS DE LEITURA CORRETA:
- Se "Quant." = 50 e "1x50" está anotado → quantidade = 1 (1 barril de 50 litros)
- Se "Quant." = 100 e "2x50" está anotado → quantidade = 2 (2 barris de 50 litros)  
- Se "Quant." = 60 e "2x30" está anotado → quantidade = 2 (2 barris de 30 litros)
- Se "Quant." = 50 para Copos → quantidade = 50 (são unidades, não barris)

IMPORTANTE: Para CHOPP, procure a anotação "NxTAMANHO" (1x50, 2x30, 4x10) e extraia:
- quantidade = N (número de barris)
- tamanhoBarril = TAMANHO (litros por barril: 10, 20, 30 ou 50)

Para itens que NÃO são chopp (Copos, Chopperia, Cilindro, Frete), a quantidade é em unidades normais.

## PRODUTOS DISPONÍVEIS NO SISTEMA (para matching):
${productList}

## INSTRUÇÕES:

1. **Cliente**: Nome exatamente como escrito no campo "Cliente:"
2. **Produtos CHOPP**: 
   - Procure a notação de barris (ex: "1x50", "2x30") 
   - quantidade = número de barris (NÃO litros)
   - tamanhoBarril = 10, 20, 30 ou 50
3. **Outros itens**: Quantidade normal em unidades
4. **Pagamento**: Qual opção está marcada (X ou ✓)
5. **Observações**: Campo "Observação" + anotações

## DICAS:
- "M" antes de valores = "R$" (ex: "M 590,00" = R$ 590,00)
- Verifique carimbo "LANÇADO" = pedido já processado`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem de pedido da Taubaté Chopp e extraia todos os dados estruturados. Preste atenção especial aos produtos, quantidades em litros, e forma de pagamento marcada.'
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
                  numeroPedido: { type: 'string', description: 'Número do pedido (Nº no canto superior direito)' },
                  dataPedido: { type: 'string', description: 'Data do pedido no formato YYYY-MM-DD' },
                  vendedor: { type: 'string', description: 'Nome do vendedor' },
                  cliente: {
                    type: 'object',
                    properties: {
                      nome: { type: 'string', description: 'Nome do cliente ou empresa' },
                      telefone: { type: 'string', description: 'Telefone do cliente' },
                      endereco: { type: 'string', description: 'Endereço completo' },
                      bairro: { type: 'string', description: 'Bairro' },
                      cidade: { type: 'string', description: 'Cidade' },
                      estado: { type: 'string', description: 'Estado (UF)' },
                      cnpjCpf: { type: 'string', description: 'CNPJ ou CPF' }
                    }
                  },
                  localEntrega: { type: 'string', description: 'Local de entrega se diferente do endereço' },
                  itens: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        nomeProduto: { type: 'string', description: 'Nome do produto (ex: Chopp Claro, Chopp Vinho, Chopp IPA, Copos descartáveis)' },
                        quantidade: { type: 'number', description: 'NÚMERO DE BARRIS para chopp (1, 2, 3...), ou unidades para outros itens. NÃO é litros!' },
                        tamanhoBarril: { type: 'number', description: 'Tamanho do barril em litros (10, 20, 30 ou 50). Só para produtos chopp.' },
                        detalhesBarris: { type: 'string', description: 'Anotação original dos barris (ex: 1x50, 2x30)' },
                        precoUnitario: { type: 'number', description: 'Preço unitário em reais' },
                        precoTotal: { type: 'number', description: 'Preço total do item' }
                      },
                      required: ['nomeProduto', 'quantidade']
                    }
                  },
                  valorTotal: { type: 'number', description: 'Valor total do pedido em reais' },
                  metodoPagamento: { 
                    type: 'string', 
                    enum: ['pix', 'cartao', 'dinheiro', 'boleto'],
                    description: 'Forma de pagamento marcada no formulário'
                  },
                  dataEntrega: { type: 'string', description: 'Data de entrega no formato YYYY-MM-DD' },
                  periodoEntrega: { 
                    type: 'string',
                    enum: ['manha', 'tarde', 'integral'],
                    description: 'Período de entrega marcado'
                  },
                  observacoes: { type: 'string', description: 'Observações do pedido' },
                  jaLancado: { type: 'boolean', description: 'Se tem carimbo LANÇADO' },
                  confianca: {
                    type: 'number',
                    description: 'Nível de confiança na extração (0-100)'
                  }
                },
                required: ['itens', 'cliente']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_order_data' } },
        max_tokens: 3000
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
      const tamanhoBarril = item.tamanhoBarril; // 10, 20, 30, or 50
      
      // Find best matching product
      let bestMatch = null;
      let bestScore = 0;

      for (const produto of produtos || []) {
        const prodName = produto.nome.toLowerCase();
        let score = 0;
        
        // For chopp products, match by type AND barrel size
        const isChopp = searchName.includes('chopp') || searchName.includes('chope');
        const prodIsChopp = prodName.includes('chopp') || prodName.includes('chope');
        
        if (isChopp && prodIsChopp && tamanhoBarril) {
          // Check if product name contains the barrel size
          const prodHasSize = prodName.includes(`${tamanhoBarril}lt`) || 
                             prodName.includes(`${tamanhoBarril} lt`) ||
                             prodName.includes(`${tamanhoBarril}l`) ||
                             prodName.includes(`${tamanhoBarril} l`) ||
                             prodName.includes(`${tamanhoBarril}lts`);
          
          // Check chopp type match
          const types = [
            { names: ['claro', 'pilsen', 'puro malte'], key: 'claro' },
            { names: ['vinho', 'vino'], key: 'vinho' },
            { names: ['ipa', 'nirvana'], key: 'ipa' },
            { names: ['escuro', 'dark'], key: 'escuro' },
            { names: ['pale ale'], key: 'pale' },
            { names: ['weiss'], key: 'weiss' },
            { names: ['limão', 'ice'], key: 'limao' }
          ];
          
          let typeMatch = false;
          for (const type of types) {
            const searchHasType = type.names.some(n => searchName.includes(n));
            const prodHasType = type.names.some(n => prodName.includes(n));
            if (searchHasType && prodHasType) {
              typeMatch = true;
              break;
            }
          }
          
          if (prodHasSize && typeMatch) {
            score = 100; // Perfect match: type + size
          } else if (typeMatch) {
            score = 50; // Type matches but not size
          } else if (prodHasSize) {
            score = 30; // Size matches but not type
          }
        } else {
          // Non-chopp products: simple text matching
          if (prodName.includes(searchName) || searchName.includes(prodName)) {
            score = 100;
          } else {
            const prodWords = prodName.split(/\s+/);
            const searchWords = searchName.split(/\s+/);
            const overlap = prodWords.filter((w: string) => 
              searchWords.some((sw: string) => sw.includes(w) || w.includes(sw))
            ).length;
            score = (overlap / Math.max(prodWords.length, searchWords.length)) * 100;
            if (score < 30) score = 0;
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = produto;
        }
      }

      matchedItems.push({
        nomeProdutoOriginal: item.nomeProduto,
        quantidade: item.quantidade,
        tamanhoBarril: item.tamanhoBarril,
        precoUnitario: item.precoUnitario || (item.precoTotal ? item.precoTotal / item.quantidade : null),
        detalhesBarris: item.detalhesBarris,
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
        numeroPedido: extractedData.numeroPedido,
        dataPedido: extractedData.dataPedido,
        vendedor: extractedData.vendedor,
        cliente: clienteInfo,
        localEntrega: extractedData.localEntrega,
        itens: matchedItems,
        valorTotal: extractedData.valorTotal,
        metodoPagamento: extractedData.metodoPagamento,
        dataEntrega: extractedData.dataEntrega,
        periodoEntrega: extractedData.periodoEntrega,
        observacoes: extractedData.observacoes,
        jaLancado: extractedData.jaLancado,
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
