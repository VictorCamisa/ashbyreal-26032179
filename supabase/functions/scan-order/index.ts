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
- **Local de Entrega**: Campo específico para endereço de entrega
- **Tabela de Produtos**: 
  - Coluna "Quant." = Quantidade (em litros)
  - Coluna "Descrição da Mercadoria" = Nome do produto + tamanho dos barris
  - Os barris são indicados como "4x50" (4 barris de 50L), "2x50", "1x30", "1x10" etc
  - Coluna "Preço unitário" e "Preço total"
- **Itens fixos no formulário**:
  - Chopp Claro (Pilsen)
  - Chopp Vinho/Vino
  - Chopp IPA
  - Chopp Escuro
  - Chopperia Elétrica (equipamento)
  - Cilindro CO² 
  - Frete
  - Copos descartáveis (Opcionais)
- **Observação**: Campo livre para anotações
- **TOTAL R$**: Valor total do pedido
- **Seção ENTREGA**: DATA de entrega, Período (Manhã/Tarde/Integral)
- **Seção PAGAMENTO**: Checkboxes para Dinheiro, Cartão, PIX, Boleto

## PRODUTOS DISPONÍVEIS NO SISTEMA:
${productList}

## INSTRUÇÕES DE EXTRAÇÃO:

1. **Cliente**: Extraia o nome exatamente como escrito no campo "Cliente:"
2. **Produtos**: 
   - Leia a coluna "Quant." para quantidade em LITROS
   - Identifique o tipo de chopp (Claro, Vinho, IPA, Escuro)
   - Se houver indicação de barris (ex: "4x50"), a quantidade já está em litros (4x50=200L)
   - Inclua itens opcionais como Copos descartáveis, Chopperia, Cilindro CO², Frete
3. **Preços**: Extraia preço unitário e total se visíveis
4. **Pagamento**: Verifique qual opção está marcada (X ou ✓) entre Dinheiro, Cartão, PIX, Boleto
5. **Data de Entrega**: Extraia do campo "DATA" na seção ENTREGA
6. **Observações**: Inclua texto do campo "Observação" e qualquer anotação relevante

## DICAS PARA LEITURA:
- Números escritos à mão podem ter formatos variados
- "M" antes de valores significa "R$" (ex: "M 590,00" = R$ 590,00)
- Verifique se há carimbo "LANÇADO" indicando pedido já processado`
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
                        quantidade: { type: 'number', description: 'Quantidade em litros ou unidades' },
                        detalhesBarris: { type: 'string', description: 'Detalhes dos barris se houver (ex: 4x50, 2x30)' },
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
        precoUnitario: item.precoUnitario || item.precoTotal / item.quantidade,
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
